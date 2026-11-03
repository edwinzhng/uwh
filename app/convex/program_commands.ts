import {
	type ProgramCommand,
	programCommandPayload,
	validateProgramRequestId,
} from "../src/domain/program-command";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const programCommandWasApplied = async (
	ctx: MutationCtx,
	membership: Doc<"memberships">,
	action: ProgramCommand,
): Promise<boolean> => {
	if (!membership.admin) throw new Error("Only admins can change programs.");
	const requestId = action.requestId;
	if (!requestId) return false;
	validateProgramRequestId(requestId);
	const receipt = await ctx.db
		.query("programCommands")
		.withIndex("by_club_actor_request", (q) =>
			q
				.eq("clubId", membership.clubId)
				.eq("actorId", membership.userId)
				.eq("requestId", requestId),
		)
		.unique();
	if (receipt && receipt.payload !== programCommandPayload(action))
		throw new Error(
			"This request ID was already used for another program change.",
		);
	return receipt !== null;
};
export const recordProgramCommand = async (
	ctx: MutationCtx,
	membership: Doc<"memberships">,
	action: ProgramCommand,
): Promise<void> => {
	if (!action.requestId) return;
	await ctx.db.insert("programCommands", {
		clubId: membership.clubId,
		actorId: membership.userId,
		requestId: action.requestId,
		payload: programCommandPayload(action),
	});
};
export const eraseProgramCommands = async (
	ctx: MutationCtx,
	input: { userId: Id<"users">; clubId?: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	const clubId = input.clubId;
	const receipts =
		input.removeClub && clubId
			? await ctx.db
					.query("programCommands")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect()
			: await ctx.db
					.query("programCommands")
					.withIndex("by_actor", (q) => q.eq("actorId", input.userId))
					.collect();
	for (const receipt of receipts) await ctx.db.delete(receipt._id);
};
