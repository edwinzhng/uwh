import { v } from "convex/values";
import { clubPrograms } from "../src/domain/programs";
import { internalMutation } from "./_generated/server";
import { writeStaffInvite } from "./staff_invites";

export const prepare = internalMutation({
	args: {
		clubId: v.id("clubs"),
		confirmation: v.literal(
			"Prepare staff access for the fictional App Review club",
		),
	},
	handler: async (
		ctx,
		{ clubId },
	): Promise<{ code: string; clubName: string; expiresAt: number }> => {
		const club = await ctx.db.get(clubId);
		if (club?.name !== "UWH Club App Review" || club.inviteCode !== "UWHR4C")
			throw new Error(
				"Only the fictional App Review club can be provisioned here.",
			);
		const [members, accounts, profiles, files] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(4),
			ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(1),
			ctx.db
				.query("memberProfiles")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(1),
			ctx.db
				.query("resourceFiles")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(1),
		]);
		if (
			members.length !== 3 ||
			accounts.length ||
			profiles.length ||
			files.length
		)
			throw new Error(
				"The review fixture has changed. Audit its contents before provisioning staff access.",
			);
		const coachPrograms = clubPrograms({ programs: club.programs })
			.filter((program) => !program.archived && program.status !== "completed")
			.map((program) => program.id);
		const code = await writeStaffInvite(
			ctx,
			club,
			{ admin: true, coachPrograms },
			{ ownerAtIssue: club.ownerId },
		);
		return { code, clubName: club.name, expiresAt: Date.now() + 14 * 86400000 };
	},
});
