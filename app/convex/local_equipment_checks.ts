import { v } from "convex/values";
import type { Loan } from "../src/domain/app-types";
import { internalQuery } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export type EquipmentInspection = {
	clubExists: boolean;
	members: string[];
	guests: { id: string; eventId: string; createdBy?: string }[];
	commands: { actorId: string; personId?: string }[];
	loans: Loan[];
};
export const inspect = internalQuery({
	args: { clubId: v.id("clubs"), observerId: v.id("users") },
	handler: async (
		ctx,
		{ clubId, observerId },
	): Promise<EquipmentInspection> => {
		const [club, observer] = await Promise.all([
			ctx.db.get(clubId),
			ctx.db.get(observerId),
		]);
		requireLocalEmail(observer?.email ?? "");
		if (
			!observer?.email?.startsWith("guest-loans-") ||
			(club && club.name !== "Guest loan verification") ||
			process.env.PUSH_DELIVERY_ENABLED === "true"
		)
			throw new Error("Isolated fictional equipment fixture required");
		const [members, guests, commands, loans] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
			ctx.db
				.query("equipmentGuests")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
			ctx.db
				.query("equipmentLoanCommands")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
			ctx.db
				.query("loans")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
		]);
		return {
			clubExists: Boolean(club),
			members: members.map((row) => row.value.id).sort(),
			guests: guests.map((row) => ({
				id: row.id,
				eventId: row.eventId,
				createdBy: row.createdBy,
			})),
			commands: commands.map((row) => ({
				actorId: row.actorId,
				personId: row.personId,
			})),
			loans: loans.map((row) => row.value),
		};
	},
});
