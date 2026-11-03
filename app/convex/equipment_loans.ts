import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { ClubEvent, Equipment } from "../src/domain/app-types";
import {
	availableLoanPractice,
	equipmentLoanLimits,
	equipmentLoanPayload,
	type PracticeBorrower,
	planEquipmentLoan,
	validateEquipmentLoanKey,
} from "../src/domain/equipment-loans";
import { clubDate } from "../src/domain/event-time";
import { mutation, query } from "./_generated/server";
import { equipmentLoanRequestValue } from "./equipment_loans_schema";
import { memberFor, requireMember } from "./identity";

const emptyPage = <T>(): PaginationResult<T> => ({
	page: [],
	isDone: true,
	continueCursor: "",
});
const pageOptions = (options: {
	numItems: number;
	cursor: string | null;
}): { numItems: number; cursor: string | null; maximumRowsRead: number } => ({
	...options,
	numItems: Math.min(equipmentLoanLimits.page, Math.max(1, options.numItems)),
	maximumRowsRead: 200,
});
export const catalog = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ paginationOpts },
	): Promise<PaginationResult<Equipment>> => {
		const actor = await memberFor(ctx);
		if (!actor?.admin) return emptyPage();
		const page = await ctx.db
			.query("equipment")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.paginate(pageOptions(paginationOpts));
		return { ...page, page: page.page.map((row) => row.value) };
	},
});
export const practices = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ paginationOpts },
	): Promise<PaginationResult<ClubEvent>> => {
		const actor = await memberFor(ctx);
		if (!actor?.admin) return emptyPage();
		const club = await ctx.db.get(actor.clubId);
		const now = Date.now();
		const today = clubDate(now, club?.timeZone);
		const page = await ctx.db
			.query("events")
			.withIndex("by_date", (q) => q.eq("clubId", actor.clubId))
			.filter((q) =>
				q.and(
					q.or(
						q.eq(q.field("value.kind"), "training"),
						q.eq(q.field("value.kind"), "hockey"),
					),
					q.eq(q.field("value.cancelled"), false),
					q.or(
						q.gte(q.field("value.date"), today),
						q.gte(q.field("value.endDate"), today),
					),
				),
			)
			.paginate(pageOptions(paginationOpts));
		return {
			...page,
			page: page.page
				.map((row) => row.value)
				.filter((event) => availableLoanPractice(event, now, club?.timeZone)),
		};
	},
});
export const guests = query({
	args: { eventId: v.string() },
	handler: async (ctx, { eventId }): Promise<PracticeBorrower[]> => {
		const actor = await memberFor(ctx);
		if (!actor?.admin) return [];
		return (
			await ctx.db
				.query("equipmentGuests")
				.withIndex("by_club_event", (q) =>
					q.eq("clubId", actor.clubId).eq("eventId", eventId),
				)
				.take(equipmentLoanLimits.guestsPerPractice)
		).map((row) => ({ id: row.id, eventId: row.eventId, name: row.name }));
	},
});
export const create = mutation({
	args: { request: equipmentLoanRequestValue },
	handler: async (ctx, { request }): Promise<string> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Only admins can loan equipment");
		validateEquipmentLoanKey(request);
		const payload = equipmentLoanPayload(request);
		const receipt = await ctx.db
			.query("equipmentLoanCommands")
			.withIndex("by_club_actor_request", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("actorId", actor.userId)
					.eq("requestId", request.requestId),
			)
			.unique();
		const existing = await ctx.db
			.query("loans")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", request.id),
			)
			.unique();
		if (receipt) {
			if (receipt.payload !== payload)
				throw new Error("This request is already in use");
			if (!existing) throw new Error("This loan is no longer available");
			return receipt.loanId;
		}
		if (existing) throw new Error("This loan ID is already in use");
		const item = await ctx.db
			.query("equipment")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", request.itemId),
			)
			.unique();
		const borrower = request.borrower;
		const [loans, member, practice, guests, namedGuest, club] =
			await Promise.all([
				ctx.db
					.query("loans")
					.withIndex("by_item_active", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.itemId", request.itemId)
							.eq("value.returned", false),
					)
					.take(Math.min(10001, (item?.value.quantity ?? 1) + 1)),
				borrower.kind === "member"
					? ctx.db
							.query("members")
							.withIndex("by_club_and_key", (q) =>
								q.eq("clubId", actor.clubId).eq("value.id", borrower.personId),
							)
							.unique()
					: undefined,
				borrower.kind === "guest"
					? ctx.db
							.query("events")
							.withIndex("by_club_and_key", (q) =>
								q.eq("clubId", actor.clubId).eq("value.id", borrower.eventId),
							)
							.unique()
					: undefined,
				borrower.kind === "guest"
					? ctx.db
							.query("equipmentGuests")
							.withIndex("by_club_event", (q) =>
								q.eq("clubId", actor.clubId).eq("eventId", borrower.eventId),
							)
							.take(equipmentLoanLimits.guestsPerPractice + 1)
					: [],
				borrower.kind === "guest"
					? ctx.db
							.query("equipmentGuests")
							.withIndex("by_club_key", (q) =>
								q.eq("clubId", actor.clubId).eq("id", borrower.guestId),
							)
							.unique()
					: undefined,
				ctx.db.get(actor.clubId),
			]);
		const now = Date.now();
		const plan = planEquipmentLoan({
			request,
			account: actor,
			item: item?.value,
			loans: loans.map((row) => row.value),
			members: member ? [member.value] : [],
			practice: practice?.value,
			guests: [
				...guests,
				...(namedGuest && !guests.some((row) => row.id === namedGuest.id)
					? [namedGuest]
					: []),
			],
			now,
			timeZone: club?.timeZone,
		});
		if (plan.guest)
			await ctx.db.insert("equipmentGuests", {
				...plan.guest,
				clubId: actor.clubId,
				createdBy: actor.userId,
				createdAt: now,
			});
		await ctx.db.insert("loans", { clubId: actor.clubId, value: plan.loan });
		await ctx.db.insert("equipmentLoanCommands", {
			clubId: actor.clubId,
			actorId: actor.userId,
			requestId: request.requestId,
			loanId: request.id,
			personId: borrower.kind === "member" ? borrower.personId : undefined,
			payload,
			createdAt: now,
		});
		return request.id;
	},
});
