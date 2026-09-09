import { createOccurrences, validateEvent } from "../src/domain/app-rules";
import type { AppAction } from "../src/domain/app-types";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { type DataScope, loadData } from "./data";
import { readPlayerCoaching } from "./player_coaching";

export const eventRows = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	ids: string[],
): Promise<Doc<"responses">[]> =>
	(
		await Promise.all(
			ids.map((id) =>
				ctx.db
					.query("responses")
					.withIndex("by_event", (q) =>
						q.eq("clubId", clubId).eq("value.eventId", id),
					)
					.collect(),
			),
		)
	).flat();
export const actionData = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	action: AppAction,
): ReturnType<typeof loadData> => {
	const scope = async (): Promise<DataScope> => {
		if ("eventId" in action) {
			const event = await ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", action.eventId),
				)
				.unique();
			const seriesId = event?.value.seriesId;
			const events =
				action.type === "edit-event" && action.scope !== "single" && seriesId
					? await ctx.db
							.query("events")
							.withIndex("by_series", (q) =>
								q.eq("clubId", clubId).eq("value.seriesId", seriesId),
							)
							.collect()
					: event
						? [event]
						: [];
			const ids = events.map((row) => row.value.id);
			return {
				select: { members: true, teams: ids, plans: ids },
				rows: { events, responses: await eventRows(ctx, clubId, ids) },
			};
		}
		switch (action.type) {
			case "create-event": {
				const error = validateEvent(action.draft);
				if (error) throw new Error(error);
				return {
					select: {
						members: action.draft.eligiblePersonIds ?? [],
						events: createOccurrences(action.id, action.draft).map(
							(entry) => entry.id,
						),
					},
				};
			}
			case "add-member":
				return {
					select: { members: [action.member.id], charges: [action.member.id] },
				};
			case "save-feedback":
				return {
					select: {
						members: [action.feedback.personId],
						feedback: [action.feedback.id],
					},
				};
			case "delete-feedback":
			case "publish-feedback": {
				const row = await ctx.db
					.query("feedback")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", action.id),
					)
					.unique();
				return {
					select: { members: row ? [row.value.personId] : [] },
					rows: { feedback: row ? [row] : [] },
				};
			}
			case "registration":
			case "goal-step":
			case "set-goal":
				return { select: { members: [action.personId] } };
			case "payment": {
				const charge = await ctx.db
					.query("charges")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", action.payment.personId),
					)
					.unique();
				const payments =
					typeof charge?.paidTotal === "number"
						? []
						: await ctx.db
								.query("payments")
								.withIndex("by_person", (q) =>
									q
										.eq("clubId", clubId)
										.eq("value.personId", action.payment.personId),
								)
								.collect();
				const duplicate = await ctx.db
					.query("payments")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", action.payment.id),
					)
					.unique();
				return {
					select: {},
					rows: {
						charges: charge ? [charge] : [],
						payments:
							duplicate && !payments.some((row) => row._id === duplicate._id)
								? [...payments, duplicate]
								: payments,
					},
				};
			}
			case "issue": {
				const active = await ctx.db
					.query("loans")
					.withIndex("by_item_active", (q) =>
						q
							.eq("clubId", clubId)
							.eq("value.itemId", action.loan.itemId)
							.eq("value.returned", false),
					)
					.collect();
				const duplicate = await ctx.db
					.query("loans")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", action.loan.id),
					)
					.unique();
				return {
					select: {
						members: [action.loan.personId],
						equipment: [action.loan.itemId],
					},
					rows: {
						loans:
							duplicate && !active.some((row) => row._id === duplicate._id)
								? [...active, duplicate]
								: active,
					},
				};
			}
			case "return":
				return { select: { loans: [action.loanId] } };
			case "add-equipment":
				return { select: { equipment: [action.equipment.id] } };
			case "add-tracker":
				return { select: { trackers: [action.tracker.id] } };
			case "tracker-value":
				return {
					select: {
						members: [action.personId],
						trackers: [action.trackerId],
						trackerValues: [`${action.trackerId}:${action.personId}`],
					},
				};
			case "create-notice":
				return { select: { notices: [action.notice.id] } };
			case "acknowledge":
				return { select: { notices: [action.noticeId], members: true } };
			case "settings":
			case "add-season":
				return { select: {} };
			default:
				throw new Error("Use the messaging command handler.");
		}
	};
	const loaded = await loadData(ctx, clubId, await scope());
	if (action.type !== "generate-teams") return loaded;
	return {
		...loaded,
		data: {
			...loaded.data,
			playerCoaching: await Promise.all(
				loaded.data.members.map((member) =>
					readPlayerCoaching(ctx, clubId, member),
				),
			),
		},
	};
};
