import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export const initializeOwner = internalMutation({
	args: {},
	handler: async (ctx): Promise<Id<"clubs">> => {
		const email = "edwinzhang64@gmail.com";
		requireLocalEmail(email);
		if (process.env.OUTBOUND_DELIVERY_DISABLED !== "true")
			throw new Error(
				"Disable outbound delivery before local workspace setup.",
			);
		const user = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", email))
			.unique();
		if (!user?.emailVerificationTime)
			throw new Error("Sign in and verify your local account first.");
		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const existing = memberships.at(0);
		if (existing) {
			const club = await ctx.db.get(existing.clubId);
			if (
				memberships.length !== 1 ||
				club?.ownerId !== user._id ||
				!["Calgary Crocs · Local", "Calgary Crocs"].includes(club.name) ||
				!existing.admin
			)
				throw new Error("Review the existing membership before local setup.");
			if (club.name !== "Calgary Crocs")
				await ctx.db.patch(club._id, { name: "Calgary Crocs" });
			return existing.clubId;
		}
		const personId = "edwin";
		const name = user.name?.trim() || "Edwin Zhang";
		const clubId = await ctx.db.insert("clubs", {
			name: "Calgary Crocs",
			ownerId: user._id,
			timeZone: "America/Edmonton",
			reminders: false,
			seasons: [
				{
					id: "2026-2027",
					name: "2026–2027",
					start: "2026-09-01",
					end: "2027-08-31",
				},
			],
		});
		await ctx.db.insert("memberships", {
			clubId,
			userId: user._id,
			name,
			personId,
			children: [],
			coachPrograms: [],
			admin: true,
		});
		await ctx.db.insert("members", {
			clubId,
			value: {
				id: personId,
				name,
				programs: ["club"],
				position: "",
				rating: 3,
				registration: "missing",
				goal: "",
				steps: 0,
			},
		});
		await ctx.db.insert("conversations", {
			clubId,
			value: {
				id: "club",
				title: "General",
				subtitle: "All club members",
				accountIds: [user._id],
			},
		});
		return clubId;
	},
});
