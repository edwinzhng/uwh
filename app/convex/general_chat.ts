import type { Account } from "../src/domain/app-types";
import type { RoomData } from "../src/domain/managed-rooms";
import {
	activeRoomPrograms,
	managedConversation,
	managedRoom,
	programRoomId,
} from "../src/domain/managed-rooms";
import { canonicalMemberAccount } from "../src/domain/member-merge-identity";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { accountFor } from "./identity";
import { resolveSessionThread } from "./session_discussion";

export type ClubRoomContext = { data: RoomData; accounts: Account[] };
export const clubRoomContext = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<ClubRoomContext> => {
	const [club, accounts, people] = await Promise.all([
		ctx.db.get(clubId),
		ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect(),
		ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect(),
	]);
	const members = people.map((person) => person.value);
	return {
		accounts: accounts.map((account) =>
			canonicalMemberAccount(accountFor(account), members),
		),
		data: {
			programs: club?.programs,
			seasons: club?.seasons ?? initialSeasons,
			timeZone: club?.timeZone,
			members,
		},
	};
};
export const resolveClubThread = async (
	ctx: QueryCtx,
	thread: Doc<"conversations">,
	context?: ClubRoomContext,
): Promise<Doc<"conversations">> => {
	if (!managedRoom(thread.value.id)) return resolveSessionThread(ctx, thread);
	const current = context ?? (await clubRoomContext(ctx, thread.clubId));
	return {
		...thread,
		value: managedConversation(thread.value, current.accounts, current.data),
	};
};
export const ensureGeneralChat = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
): Promise<string> => {
	const [existing, context] = await Promise.all([
		ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect(),
		clubRoomContext(ctx, clubId),
	]);
	for (const id of [
		"club",
		...activeRoomPrograms(context.data).map((program) =>
			programRoomId(program.id),
		),
	]) {
		const row = existing.find((thread) => thread.value.id === id);
		const value = managedConversation(
			row?.value ?? { id, title: "", subtitle: "", accountIds: [] },
			context.accounts,
			context.data,
		);
		if (!row) await ctx.db.insert("conversations", { clubId, value });
		else if (JSON.stringify(row.value) !== JSON.stringify(value))
			await ctx.db.patch(row._id, { value });
	}
	return "club";
};
