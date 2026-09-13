import { v } from "convex/values";
import type { SeasonRecord } from "../src/domain/season-ledger";
import { query } from "./_generated/server";
import { requireMember } from "./identity";
import { readSeasonRecord } from "./season_records";

export const household = query({
	args: { seasonId: v.string() },
	handler: async (ctx, { seasonId }): Promise<SeasonRecord[]> => {
		const member = await requireMember(ctx);
		return Promise.all(
			[member.personId, ...member.children].map((personId) =>
				readSeasonRecord(ctx, member.clubId, seasonId, personId),
			),
		);
	},
});
