import {
	coreMemberMerge,
	mergeCollision,
	mergedEvent,
} from "../src/domain/core-member-merge";
import {
	type MemberMergeConflict,
	memberMergeFingerprint,
	memberMergeLimits,
	replaceMergedPerson,
} from "../src/domain/member-merge";
import { directThreadKey } from "../src/domain/messaging";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { loadData } from "./data";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

export const mergeScanConflicts = (
	category: string,
	rows: readonly object[],
): MemberMergeConflict[] =>
	rows.length > memberMergeLimits.rows
		? [
				mergeCollision(
					category,
					"Member history",
					"This history exceeds the safe interactive merge limit.",
					"Use a reviewed migration for this history; no records have changed.",
				),
			]
		: [];

const conversationUpdate = (
	row: Doc<"conversations">,
	input: MemberMergeContext,
): Pick<
	Doc<"conversations">,
	| "pendingPersonId"
	| "pendingPersonIds"
	| "recipientPersonId"
	| "directKey"
	| "value"
> => ({
	pendingPersonId:
		row.pendingPersonId === input.source.id
			? input.target.id
			: row.pendingPersonId,
	pendingPersonIds: row.pendingPersonIds
		? replaceMergedPerson(
				row.pendingPersonIds,
				input.source.id,
				input.target.id,
			)
		: undefined,
	recipientPersonId:
		row.recipientPersonId === input.source.id
			? input.target.id
			: row.recipientPersonId,
	directKey:
		row.recipientPersonId === input.source.id &&
		row.directKey &&
		row.value.accountIds.at(0)
			? directThreadKey(
					row.value.accountIds.at(0) ?? "",
					`person:${input.target.id}`,
				)
			: row.directKey,
	value: {
		...row.value,
		participantPersonIds: row.value.participantPersonIds
			? replaceMergedPerson(
					row.value.participantPersonIds,
					input.source.id,
					input.target.id,
				)
			: undefined,
	},
});

export const planCoreMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const clubId = input.clubId;
	const [
		events,
		conversations,
		trackers,
		trackerValues,
		responses,
		feedback,
		loans,
		payments,
		charges,
		flags,
	] = await Promise.all([
		ctx.db
			.query("events")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("trackers")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("trackerValues")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(memberMergeLimits.rows + 1),
		Promise.all(
			[input.source.id, input.target.id].map((id) =>
				ctx.db
					.query("responses")
					.withIndex("by_person", (q) =>
						q.eq("clubId", clubId).eq("value.personId", id),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
		ctx.db
			.query("feedback")
			.withIndex("by_person_date", (q) =>
				q.eq("clubId", clubId).eq("value.personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("loans")
			.withIndex("by_person", (q) =>
				q.eq("clubId", clubId).eq("value.personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		Promise.all(
			[input.source.id, input.target.id].map((id) =>
				ctx.db
					.query("payments")
					.withIndex("by_person", (q) =>
						q.eq("clubId", clubId).eq("value.personId", id),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
		Promise.all(
			[input.source.id, input.target.id].map((id) =>
				ctx.db
					.query("charges")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
			),
		).then((rows) => rows.filter((row) => row !== null)),
		Promise.all(
			[input.source.id, input.target.id].map((id) =>
				ctx.db
					.query("eventAttendanceFlags")
					.withIndex("by_club_person", (q) =>
						q.eq("clubId", clubId).eq("personId", id),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
	]);
	const loaded = await loadData(ctx, clubId, {
		select: {},
		rows: {
			events,
			conversations,
			trackers,
			trackerValues,
			responses,
			feedback,
			loans,
			payments,
			charges,
		},
	});
	const preview = coreMemberMerge(loaded.data, input);
	const affectedConversations = conversations.filter(
		(row) =>
			row.pendingPersonId === input.source.id ||
			row.pendingPersonIds?.includes(input.source.id) ||
			row.recipientPersonId === input.source.id ||
			row.value.participantPersonIds?.includes(input.source.id),
	);
	const conflicts = [
		...preview.conflicts,
		...[
			events,
			conversations,
			trackers,
			trackerValues,
			responses,
			feedback,
			loans,
			payments,
			flags,
		].flatMap((rows) => mergeScanConflicts("Core history", rows)),
		...flags
			.filter(
				(row) =>
					row.personId === input.source.id &&
					flags.some(
						(other) =>
							other.personId === input.target.id &&
							other.eventId === row.eventId,
					),
			)
			.map((row) =>
				mergeCollision(
					"Attendance flags",
					row.eventId,
					"Both profiles have an attendance addition or cancellation for this event.",
					"Resolve the duplicate roster flags before merging.",
				),
			),
		...affectedConversations
			.filter((row) => {
				const next = conversationUpdate(row, input);
				return (
					next.directKey &&
					next.directKey !== row.directKey &&
					conversations.some(
						(other) =>
							other._id !== row._id && other.directKey === next.directKey,
					)
				);
			})
			.map((row) =>
				mergeCollision(
					"Direct conversations",
					row.value.title,
					"Both profiles have separate direct conversations with the same account.",
					"Keep these identities separate until their conversation histories have been reviewed; no messages will be discarded.",
				),
			),
	];
	const sourceTrackers = trackers.flatMap((tracker) => {
		const row = trackerValues.find(
			(value) => value.value.id === `${tracker.value.id}:${input.source.id}`,
		);
		return row
			? [
					{
						row,
						target: trackerValues.find(
							(value) =>
								value.value.id === `${tracker.value.id}:${input.target.id}`,
						),
						id: `${tracker.value.id}:${input.target.id}`,
					},
				]
			: [];
	});
	const sourceCharge = charges.find(
		(row) => row.value.personId === input.source.id,
	);
	const targetCharge = charges.find(
		(row) => row.value.personId === input.target.id,
	);
	return {
		preserved: [
			{
				category: "Prior dues and tracker summaries",
				records: JSON.stringify({
					charges,
					trackerValues: sourceTrackers.map((entry) => entry.row),
				}),
			},
		],
		counts: [
			...preview.counts.filter(
				(row) => row.label !== "Conversation person labels relinked",
			),
			{
				label: "Conversation person labels relinked",
				count: affectedConversations.length,
			},
			{
				label: "Attendance roster flags relinked",
				count: flags.filter((row) => row.personId === input.source.id).length,
			},
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify({
				events,
				conversations,
				trackers,
				trackerValues,
				responses,
				feedback,
				loans,
				payments,
				charges,
				flags,
				programs: loaded.data.programs,
			}),
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve core history conflicts first.");
			await write.db.patch(clubId, { programs: preview.next.programs });
			for (const row of events.filter(
				(row) =>
					row.value.eligiblePersonIds?.includes(input.source.id) ||
					row.value.tournamentRoster?.some(
						(entry) => entry.personId === input.source.id,
					),
			))
				await write.db.patch(row._id, {
					value: mergedEvent(row.value, input.source.id, input.target.id),
				});
			for (const row of responses.filter(
				(row) => row.value.personId === input.source.id,
			))
				await write.db.patch(row._id, {
					value: {
						...row.value,
						id: `${row.value.eventId}:${input.target.id}`,
						personId: input.target.id,
					},
				});
			for (const row of feedback)
				await write.db.patch(row._id, {
					value: { ...row.value, personId: input.target.id },
				});
			for (const row of loans)
				await write.db.patch(row._id, {
					value: { ...row.value, personId: input.target.id },
				});
			for (const row of payments.filter(
				(row) => row.value.personId === input.source.id,
			))
				await write.db.patch(row._id, {
					value: { ...row.value, personId: input.target.id },
				});
			if (sourceCharge) {
				const retained = targetCharge ?? sourceCharge;
				await write.db.patch(retained._id, {
					value: {
						...retained.value,
						id: input.target.id,
						personId: input.target.id,
						amount:
							(sourceCharge.value.amount ?? 0) +
							(targetCharge?.value.amount ?? 0),
					},
					paidTotal: preview.next.paymentTotals?.[input.target.id] ?? 0,
				});
				if (targetCharge) await write.db.delete(sourceCharge._id);
			} else if (targetCharge)
				await write.db.patch(targetCharge._id, {
					paidTotal: preview.next.paymentTotals?.[input.target.id] ?? 0,
				});
			for (const entry of sourceTrackers) {
				if (entry.target) await write.db.delete(entry.row._id);
				else
					await write.db.patch(entry.row._id, {
						value: { ...entry.row.value, id: entry.id },
					});
			}
			for (const row of affectedConversations)
				await write.db.patch(row._id, conversationUpdate(row, input));
			for (const row of flags.filter((row) => row.personId === input.source.id))
				await write.db.patch(row._id, { personId: input.target.id });
		},
	};
};
