import { actionPeople } from "../src/domain/action-people";
import type { AppAction } from "../src/domain/app-types";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const rejectMergedAliasAction = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	action: AppAction,
): Promise<void> => {
	const people = [...new Set(actionPeople(action))];
	if (people.length > 1000)
		throw new Error("Choose up to 1,000 members per change.");
	const rows = await Promise.all(
		people.map((personId) =>
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", personId),
				)
				.unique(),
		),
	);
	if (rows.some((row) => row?.value.mergedInto))
		throw new Error(
			"This profile was merged. Open the current member before making changes.",
		);
};
