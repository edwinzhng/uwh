import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { validDate } from "../src/domain/app-rules";
import {
	applyLedgerChange,
	type LedgerChange,
	type SeasonRecord,
} from "../src/domain/season-ledger";
import { defaultSeasonId, initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";
import { registrationValue } from "./season_schema";

export const readSeasonRecord = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	seasonId: string,
	personId: string,
): Promise<SeasonRecord> => {
	const row = await ctx.db
		.query("seasonRecords")
		.withIndex("by_club_season_person", (q) =>
			q.eq("clubId", clubId).eq("seasonId", seasonId).eq("personId", personId),
		)
		.unique();
	if (row)
		return {
			personId,
			seasonId,
			registration: row.registration,
			cuga: row.cuga,
			due: row.due,
			paid: row.paid,
			revision: row.revision,
		};
	const blank: SeasonRecord = {
		personId,
		seasonId,
		registration: "missing",
		cuga: false,
		due: 0,
		paid: 0,
		revision: 0,
	};
	if (seasonId !== defaultSeasonId) return blank;
	const [member, charge, tracker] = await Promise.all([
		ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", personId),
			)
			.unique(),
		ctx.db
			.query("charges")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", personId),
			)
			.unique(),
		ctx.db
			.query("trackerValues")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", `membership:${personId}`),
			)
			.unique(),
	]);
	const paid =
		charge?.paidTotal ??
		(
			await ctx.db
				.query("payments")
				.withIndex("by_person", (q) =>
					q.eq("clubId", clubId).eq("value.personId", personId),
				)
				.collect()
		).reduce((sum, payment) => sum + payment.value.amount, 0);
	return {
		...blank,
		registration: member?.value.registration ?? "missing",
		cuga: ["yes", "Active"].includes(tracker?.value.value ?? ""),
		due: charge?.value.amount ?? 0,
		paid,
	};
};
const checkPerson = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	seasonId: string,
	personId: string,
): Promise<void> => {
	if (
		!actor.admin &&
		actor.personId !== personId &&
		!actor.children.includes(personId)
	)
		throw new Error("This record is private.");
	const [club, person] = await Promise.all([
		ctx.db.get(actor.clubId),
		ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", personId),
			)
			.unique(),
	]);
	if (
		!person ||
		!(club?.seasons ?? initialSeasons).some((season) => season.id === seasonId)
	)
		throw new Error("Choose a member and season.");
};
export const saveSeasonRecord = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	record: SeasonRecord,
): Promise<void> => {
	const row = await ctx.db
		.query("seasonRecords")
		.withIndex("by_club_season_person", (q) =>
			q
				.eq("clubId", clubId)
				.eq("seasonId", record.seasonId)
				.eq("personId", record.personId),
		)
		.unique();
	if (row) await ctx.db.patch(row._id, record);
	else await ctx.db.insert("seasonRecords", { clubId, ...record });
};
export const record = query({
	args: { personId: v.string(), seasonId: v.string() },
	handler: async (ctx, args): Promise<SeasonRecord> => {
		const actor = await requireMember(ctx);
		await checkPerson(ctx, actor, args.seasonId, args.personId);
		return readSeasonRecord(ctx, actor.clubId, args.seasonId, args.personId);
	},
});
export const history = query({
	args: {
		personId: v.string(),
		seasonId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		args,
	): Promise<PaginationResult<Doc<"seasonLedger">>> => {
		const actor = await requireMember(ctx);
		await checkPerson(ctx, actor, args.seasonId, args.personId);
		return ctx.db
			.query("seasonLedger")
			.withIndex("by_record", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("seasonId", args.seasonId)
					.eq("personId", args.personId),
			)
			.order("desc")
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 30),
			});
	},
});
export const summary = query({
	args: { seasonId: v.string(), personIds: v.array(v.string()) },
	handler: async (ctx, args): Promise<SeasonRecord[]> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		if (args.personIds.length > 50) throw new Error("Choose up to 50 members.");
		return Promise.all(
			args.personIds.map((personId) =>
				readSeasonRecord(ctx, actor.clubId, args.seasonId, personId),
			),
		);
	},
});
export const change = mutation({
	args: {
		personId: v.string(),
		seasonId: v.string(),
		key: v.string(),
		revision: v.number(),
		change: v.union(
			v.object({
				kind: v.literal("registration"),
				status: registrationValue,
				cuga: v.boolean(),
			}),
			v.object({
				kind: v.union(
					v.literal("payment"),
					v.literal("refund"),
					v.literal("dues"),
				),
				amount: v.number(),
				note: v.string(),
				date: v.string(),
			}),
		),
	},
	handler: async (ctx, args): Promise<null> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		await checkPerson(ctx, actor, args.seasonId, args.personId);
		const existing = await ctx.db
			.query("seasonLedger")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", actor.clubId).eq("key", args.key),
			)
			.unique();
		if (existing) return null;
		const before = await readSeasonRecord(
			ctx,
			actor.clubId,
			args.seasonId,
			args.personId,
		);
		if (before.revision !== args.revision)
			throw new Error("This record changed. Review it and try again.");
		const change = args.change;
		if (change.kind !== "registration" && !validDate(change.date))
			throw new Error("Choose a date.");
		const after =
			change.kind === "registration"
				? {
						...before,
						registration: change.status,
						cuga: change.cuga,
						revision: before.revision + 1,
					}
				: applyLedgerChange(before, change satisfies LedgerChange);
		await saveSeasonRecord(ctx, actor.clubId, after);
		await ctx.db.insert("seasonLedger", {
			clubId: actor.clubId,
			personId: args.personId,
			seasonId: args.seasonId,
			key: args.key,
			kind: change.kind,
			amount: change.kind === "registration" ? 0 : change.amount,
			note:
				change.kind === "registration"
					? `Registration: ${change.status} · CUGA: ${change.cuga ? "Yes" : "No"}`
					: change.note.trim(),
			date:
				change.kind === "registration"
					? new Date().toISOString().slice(0, 10)
					: change.date,
			actor: actor.name,
			actorId: actor.userId,
			createdAt: Date.now(),
			before: JSON.stringify(before),
			after: JSON.stringify(after),
		});
		return null;
	},
});
