import { ConvexError, v } from "convex/values";
import {
	canEditMemberCapNumber,
	canEditMemberProfile,
	type MemberProfile,
	memberBirthDateError,
	memberCapNumberError,
	memberProfileError,
	memberProfileProjection,
	normalizeMemberProfile,
} from "../src/domain/member-profile";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { checkContent } from "./chat_policy";
import { accountFor, memberFor, requireMember } from "./identity";

export const avatars = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{ personId: string; name: string; photoId?: string }[]> => {
		const actor = await memberFor(ctx);
		if (!actor) return [];
		const [members, profiles] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
			ctx.db
				.query("memberProfiles")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
		]);
		const photos = new Map(
			profiles.map((profile) => [profile.personId, profile.photoId]),
		);
		return members.map(({ value }) => ({
			personId: value.id,
			name: value.name,
			photoId: photos.get(value.id),
		}));
	},
});

export const profilePerson = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"members">> => {
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", personId),
		)
		.unique();
	if (!person) throw new ConvexError("Member unavailable.");
	return person;
};
export const profileRecord = (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"memberProfiles"> | null> =>
	ctx.db
		.query("memberProfiles")
		.withIndex("by_club_person", (q) =>
			q.eq("clubId", clubId).eq("personId", personId),
		)
		.unique();

export const read = query({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<MemberProfile> => {
		const actor = await requireMember(ctx);
		const [person, profile] = await Promise.all([
			profilePerson(ctx, actor.clubId, personId),
			profileRecord(ctx, actor.clubId, personId),
		]);
		return memberProfileProjection(
			accountFor(actor),
			person.value,
			profile ?? undefined,
		);
	},
});
export const save = mutation({
	args: {
		personId: v.string(),
		revision: v.number(),
		expectedName: v.string(),
		key: v.string(),
		name: v.string(),
		email: v.string(),
		phone: v.string(),
		capNumber: v.string(),
		birthDate: v.optional(v.string()),
		competitionGender: v.optional(
			v.union(
				v.literal(""),
				v.literal("male"),
				v.literal("female"),
				v.literal("other"),
			),
		),
		photoId: v.optional(v.string()),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		await checkContent(ctx, actor, input.name);
		const person = await profilePerson(ctx, actor.clubId, input.personId);
		if (!canEditMemberProfile(actor, person.value))
			throw new ConvexError("You can only edit active household profiles.");
		const error = memberProfileError(input);
		if (error) throw new ConvexError(error);
		if (input.key.length < 16 || input.key.length > 100)
			throw new ConvexError("Reopen the profile editor and try again.");
		const fields = normalizeMemberProfile(input);
		const payload = JSON.stringify(fields);
		const previous = await profileRecord(ctx, actor.clubId, input.personId);
		if (previous?.lastKey === input.key) {
			if (
				previous.lastActorId !== actor.userId ||
				previous.lastPayload !== payload
			)
				throw new ConvexError(
					"This save key was already used for other details.",
				);
			return;
		}
		if (
			(previous?.revision ?? 0) !== input.revision ||
			person.value.name !== input.expectedName
		)
			throw new ConvexError(
				"Profile changed in another session. Close and reopen to review the latest details.",
			);
		if (
			fields.capNumber !== previous?.capNumber &&
			!canEditMemberCapNumber(actor, person.value)
		)
			throw new ConvexError("Only assigned coaches can change cap numbers.");

		const photoId = fields.photoId
			? ctx.db.normalizeId("memberProfilePhotos", fields.photoId)
			: undefined;
		if (fields.photoId) {
			const photo = photoId ? await ctx.db.get(photoId) : undefined;
			if (
				!photo ||
				photo.clubId !== actor.clubId ||
				(photo.personId !== input.personId &&
					photo._id !== previous?.photoId) ||
				(photo._id !== previous?.photoId &&
					(photo.ownerId !== actor.userId || photo.attached))
			)
				throw new ConvexError("Photo unavailable. Choose the photo again.");
			await ctx.db.patch(photo._id, { attached: true });
		}
		const next = {
			clubId: actor.clubId,
			personId: input.personId,
			capNumber: fields.capNumber,
			birthDate:
				input.birthDate === undefined ? previous?.birthDate : fields.birthDate,
			competitionGender:
				input.competitionGender === undefined
					? previous?.competitionGender
					: fields.competitionGender,
			email: fields.email,
			phone: fields.phone,
			photoId: photoId ?? undefined,
			revision: (previous?.revision ?? 0) + 1,
			lastKey: input.key,
			lastActorId: actor.userId,
			lastPayload: payload,
			updatedAt: Date.now(),
		};
		if (previous) await ctx.db.patch(previous._id, next);
		else await ctx.db.insert("memberProfiles", next);
		await ctx.db.patch(person._id, {
			value: { ...person.value, name: fields.name },
		});
		if (fields.name !== person.value.name) {
			const linked = await ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.filter((q) => q.eq(q.field("personId"), input.personId))
				.collect();
			for (const account of linked) {
				await ctx.db.patch(account._id, { name: fields.name });
				await ctx.db.patch(account.userId, { name: fields.name });
			}
		}
		if (previous?.photoId && previous.photoId !== photoId) {
			const retained = await ctx.db
				.query("memberProfiles")
				.withIndex("by_photo", (q) => q.eq("photoId", previous.photoId))
				.first();
			if (retained) return;
			const old = await ctx.db.get(previous.photoId);
			if (old) {
				await ctx.storage.delete(old.storageId);
				await ctx.db.delete(old._id);
			}
		}
	},
});

export const saveCapNumber = mutation({
	args: {
		personId: v.string(),
		revision: v.number(),
		capNumber: v.string(),
		birthDate: v.optional(v.string()),
		competitionGender: v.optional(
			v.union(
				v.literal(""),
				v.literal("male"),
				v.literal("female"),
				v.literal("other"),
			),
		),
		key: v.string(),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		const person = await profilePerson(ctx, actor.clubId, input.personId);
		if (!canEditMemberCapNumber(actor, person.value))
			throw new ConvexError("Only assigned coaches can change cap numbers.");
		const error =
			memberCapNumberError(input.capNumber) ??
			memberBirthDateError(input.birthDate);
		if (error) throw new ConvexError(error);
		if (input.key.length < 16 || input.key.length > 100)
			throw new ConvexError("Reopen the cap number editor and try again.");
		const capNumber = input.capNumber.trim()
			? Number(input.capNumber.trim())
			: undefined;
		const payload = JSON.stringify({
			capNumber,
			birthDate: input.birthDate,
			competitionGender: input.competitionGender,
		});
		const previous = await profileRecord(ctx, actor.clubId, input.personId);
		if (previous?.lastKey === input.key) {
			if (
				previous.lastActorId !== actor.userId ||
				previous.lastPayload !== payload
			)
				throw new ConvexError(
					"This save key was already used for other details.",
				);
			return;
		}
		if ((previous?.revision ?? 0) !== input.revision)
			throw new ConvexError(
				"Profile changed in another session. Close and reopen to review the latest details.",
			);
		const next = {
			capNumber,
			...(input.birthDate === undefined
				? {}
				: { birthDate: input.birthDate || undefined }),
			...(input.competitionGender === undefined
				? {}
				: { competitionGender: input.competitionGender || undefined }),
			revision: (previous?.revision ?? 0) + 1,
			lastKey: input.key,
			lastActorId: actor.userId,
			lastPayload: payload,
			updatedAt: Date.now(),
		};
		if (previous) await ctx.db.patch(previous._id, next);
		else
			await ctx.db.insert("memberProfiles", {
				...next,
				clubId: actor.clubId,
				personId: input.personId,
				email: "",
				phone: "",
			});
	},
});
