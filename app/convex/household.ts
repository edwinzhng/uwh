import { v } from "convex/values";
import {
	type HouseholdState,
	householdLimits,
	householdNameError,
	householdProjection,
} from "../src/domain/household";
import { memberMergeFingerprint } from "../src/domain/member-merge";
import { mutation, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { assertCanonicalMember } from "./member_alias";
import { profilePerson } from "./member_profiles";

const operationKey = (key: string): void => {
	if (key.length < 16 || key.length > 100)
		throw new Error("Reopen household settings and try again.");
};
export const state = query({
	args: {},
	handler: async (ctx): Promise<HouseholdState> => {
		const actor = await requireMember(ctx);
		const links = await ctx.db
			.query("householdLinks")
			.withIndex("by_club_user", (q) =>
				q.eq("clubId", actor.clubId).eq("userId", actor.userId),
			)
			.take(101);
		const ids = [
			...new Set([
				actor.personId,
				...actor.children,
				...links
					.filter((row) => row.state === "available")
					.map((row) => row.personId),
			]),
		];
		const people = (
			await Promise.all(
				ids.map((personId) =>
					ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", actor.clubId).eq("value.id", personId),
						)
						.unique(),
				),
			)
		)
			.filter((row) => row !== null)
			.map((row) => row.value);
		return householdProjection(
			accountFor(actor),
			people,
			links
				.filter(
					(link) =>
						link.state === "available" &&
						link.personId !== actor.personId &&
						!actor.children.includes(link.personId) &&
						people.some(
							(person) =>
								person.id === link.personId &&
								!person.archived &&
								!person.mergedInto,
						),
				)
				.map((link) => ({
					id: link._id,
					personId: link.personId,
					origin: link.origin,
					name:
						people.find((person) => person.id === link.personId)?.name ??
						"Member",
				}))
				.filter(
					(row, index, all) =>
						all.findIndex((entry) => entry.personId === row.personId) === index,
				),
		);
	},
});
export const create = mutation({
	args: { name: v.string(), key: v.string() },
	handler: async (ctx, input): Promise<string> => {
		const actor = await requireMember(ctx);
		operationKey(input.key);
		const error = householdNameError(input.name);
		if (error) throw new Error(error);
		const payload = input.name.trim();
		const links = await ctx.db
			.query("householdLinks")
			.withIndex("by_club_user", (q) =>
				q.eq("clubId", actor.clubId).eq("userId", actor.userId),
			)
			.take(101);
		const previous = links.find((row) => row.key === input.key);
		if (previous) {
			if (previous.origin !== "created" || previous.payload !== payload)
				throw new Error(
					"This request key was already used for another profile.",
				);
			return previous.personId;
		}
		if (
			actor.children.length >= householdLimits.linked ||
			links.filter((row) => row.origin === "created").length >=
				householdLimits.created ||
			links.length >= 100
		)
			throw new Error(
				"Contact an administrator to review additional household profiles.",
			);
		const personId = `dependent:${memberMergeFingerprint([actor.userId, input.key])}`;
		await ctx.db.insert("members", {
			clubId: actor.clubId,
			value: {
				id: personId,
				name: payload,
				programs: [],
				position: "",
				rating: 0,
				registration: "missing",
				goal: "",
				steps: 0,
			},
		});
		await ctx.db.insert("householdLinks", {
			clubId: actor.clubId,
			userId: actor.userId,
			personId,
			origin: "created",
			state: "accepted",
			createdBy: actor.userId,
			key: input.key,
			payload,
			createdAt: Date.now(),
		});
		await ctx.db.patch(actor._id, { children: [...actor.children, personId] });
		return personId;
	},
});
export const invite = mutation({
	args: { accountId: v.string(), personId: v.string(), key: v.string() },
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		operationKey(input.key);
		const userId = ctx.db.normalizeId("users", input.accountId);
		const target = userId
			? await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.first()
			: undefined;
		const user = userId ? await ctx.db.get(userId) : undefined;
		const person = await profilePerson(ctx, actor.clubId, input.personId);
		if (
			!target ||
			target.clubId !== actor.clubId ||
			!user?.emailVerificationTime ||
			target.personId === input.personId ||
			person.value.archived ||
			person.value.mergedInto
		)
			throw new Error(
				"Choose an active member and a verified club account without this household link.",
			);
		const links = await ctx.db
			.query("householdLinks")
			.withIndex("by_club_user", (q) =>
				q.eq("clubId", actor.clubId).eq("userId", target.userId),
			)
			.take(101);
		const payload = `${actor.userId}:${input.personId}`;
		const previous = links.find((row) => row.key === input.key);
		if (previous) {
			if (previous.payload !== payload)
				throw new Error("This request key was already used.");
			return;
		}
		if (target.children.includes(input.personId))
			throw new Error("That account already has this household link.");
		if (links.length >= 100)
			throw new Error("Review existing household invitations first.");
		if (
			links.some(
				(row) => row.personId === input.personId && row.state === "available",
			)
		)
			return;
		await ctx.db.insert("householdLinks", {
			clubId: actor.clubId,
			userId: target.userId,
			personId: input.personId,
			origin: "administrator",
			state: "available",
			createdBy: actor.userId,
			key: input.key,
			payload,
			createdAt: Date.now(),
		});
	},
});
export const accept = mutation({
	args: { id: v.string() },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await requireMember(ctx);
		const linkId = ctx.db.normalizeId("householdLinks", id);
		const link = linkId ? await ctx.db.get(linkId) : undefined;
		if (
			!link ||
			link.clubId !== actor.clubId ||
			link.userId !== actor.userId ||
			!["available", "accepted"].includes(link.state)
		)
			throw new Error("Household invitation unavailable.");
		const person = await profilePerson(ctx, actor.clubId, link.personId);
		if (
			person.value.archived ||
			person.value.mergedInto ||
			actor.personId === link.personId
		)
			throw new Error("Choose an active household profile.");
		if (actor.children.includes(link.personId)) return;
		if (actor.children.length >= householdLimits.linked)
			throw new Error(
				"Contact an administrator to review additional household profiles.",
			);
		await ctx.db.patch(actor._id, {
			children: [...actor.children, link.personId],
		});
		await ctx.db.patch(link._id, { state: "accepted" });
	},
});
export const dismiss = mutation({
	args: { id: v.string() },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await requireMember(ctx);
		const linkId = ctx.db.normalizeId("householdLinks", id);
		const link = linkId ? await ctx.db.get(linkId) : undefined;
		if (
			!link ||
			link.clubId !== actor.clubId ||
			link.userId !== actor.userId ||
			link.state !== "available"
		)
			throw new Error("Household invitation unavailable.");
		await ctx.db.patch(link._id, { state: "dismissed" });
	},
});
export const unlink = mutation({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<void> => {
		const actor = await requireMember(ctx);
		if (actor.personId === personId || !actor.children.includes(personId))
			throw new Error(
				"You can only unlink a current dependent, not your own login identity.",
			);
		await assertCanonicalMember(ctx, actor.clubId, personId);
		const links = await ctx.db
			.query("householdLinks")
			.withIndex("by_club_user_person", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("userId", actor.userId)
					.eq("personId", personId),
			)
			.collect();
		if (links.length)
			for (const link of links)
				await ctx.db.patch(link._id, { state: "available" });
		else {
			const previous = await ctx.db
				.query("householdLinks")
				.withIndex("by_club_user", (q) =>
					q.eq("clubId", actor.clubId).eq("userId", actor.userId),
				)
				.take(100);
			if (previous.length < 100)
				await ctx.db.insert("householdLinks", {
					clubId: actor.clubId,
					userId: actor.userId,
					personId,
					origin: "previous",
					state: "available",
					key: `unlink:${personId}`,
					payload: personId,
					createdAt: Date.now(),
				});
		}
		await ctx.db.patch(actor._id, {
			children: actor.children.filter((id) => id !== personId),
			defaultPersonId:
				actor.defaultPersonId === personId
					? actor.personId
					: actor.defaultPersonId,
		});
	},
});
export const setDefault = mutation({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<void> => {
		const actor = await requireMember(ctx);
		const person = await profilePerson(ctx, actor.clubId, personId);
		if (
			![actor.personId, ...actor.children].includes(personId) ||
			person.value.archived ||
			person.value.mergedInto
		)
			throw new Error("Choose an active linked household profile.");
		await ctx.db.patch(actor._id, { defaultPersonId: personId });
	},
});
