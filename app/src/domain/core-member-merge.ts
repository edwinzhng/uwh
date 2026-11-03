import type { AppData } from "./app-types";
import {
	type MemberMergeConflict,
	type MemberMergeCount,
	type MemberMergePair,
	replaceMergedPerson,
} from "./member-merge";
import { clubPrograms } from "./programs";

export const mergeCollision = (
	category: string,
	record: string,
	reason: string,
	resolution: string,
): MemberMergeConflict => ({ category, record, reason, resolution });
export const mergedEvent = (
	event: AppData["events"][number],
	sourceId: string,
	targetId: string,
): AppData["events"][number] => ({
	...event,
	eligiblePersonIds: event.eligiblePersonIds
		? replaceMergedPerson(event.eligiblePersonIds, sourceId, targetId)
		: undefined,
	tournamentRoster: event.tournamentRoster
		?.map((entry) => ({
			...entry,
			personId: entry.personId === sourceId ? targetId : entry.personId,
		}))
		.filter(
			(entry, index, all) =>
				all.findIndex((candidate) => candidate.personId === entry.personId) ===
				index,
		),
});

export const coreMemberMerge = (
	data: AppData,
	pair: MemberMergePair,
): {
	next: AppData;
	counts: MemberMergeCount[];
	conflicts: MemberMergeConflict[];
} => {
	const { source, target } = pair;
	const responses = data.responses.filter((row) => row.personId === source.id);
	const sourceCharge = data.charges.find((row) => row.personId === source.id);
	const targetCharge = data.charges.find((row) => row.personId === target.id);
	const sourceTrackers = data.trackers.filter(
		(tracker) =>
			Object.getOwnPropertyDescriptor(
				data.trackerValues,
				`${tracker.id}:${source.id}`,
			) !== undefined,
	);
	const conflicts = [
		...responses
			.filter((row) =>
				data.responses.some(
					(other) =>
						other.personId === target.id && other.eventId === row.eventId,
				),
			)
			.map((row) =>
				mergeCollision(
					"Attendance",
					data.events.find((event) => event.id === row.eventId)?.title ??
						row.eventId,
					"Both profiles have a response or attendance record for this event.",
					"Review the two attendance histories and resolve this event before merging.",
				),
			),
		...sourceTrackers
			.filter(
				(tracker) =>
					Object.getOwnPropertyDescriptor(
						data.trackerValues,
						`${tracker.id}:${target.id}`,
					) !== undefined &&
					data.trackerValues[`${tracker.id}:${source.id}`] !==
						data.trackerValues[`${tracker.id}:${target.id}`],
			)
			.map((tracker) =>
				mergeCollision(
					"Trackers",
					tracker.name,
					"The two profiles have different tracker values.",
					"Set the same agreed value on both member records, then preview again.",
				),
			),
		...(sourceCharge?.amount && targetCharge?.amount
			? [
					mergeCollision(
						"Membership dues",
						"Current dues",
						"Both profiles have non-zero current dues; combining them could double-charge the member.",
						"Reconcile current dues on the two Membership screens so only one balance remains.",
					),
				]
			: []),
		...data.events
			.filter(
				(event) =>
					event.tournamentRoster?.some((row) => row.personId === source.id) &&
					event.tournamentRoster?.some(
						(row) =>
							row.personId === target.id &&
							row.team !==
								event.tournamentRoster?.find(
									(entry) => entry.personId === source.id,
								)?.team,
					),
			)
			.map((event) =>
				mergeCollision(
					"Tournament teams",
					event.title,
					"The two profiles are assigned to different tournament teams.",
					"Choose the same team for both profiles in the tournament roster before merging.",
				),
			),
	];
	const feedback = data.feedback.filter((row) => row.personId === source.id);
	const loans = data.loans.filter((row) => row.personId === source.id);
	const payments = data.payments.filter((row) => row.personId === source.id);
	const affectedEvents = data.events.filter(
		(event) =>
			event.eligiblePersonIds?.includes(source.id) ||
			event.tournamentRoster?.some((row) => row.personId === source.id),
	);
	const conversations = data.conversations.filter((row) =>
		row.participantPersonIds?.includes(source.id),
	);
	const trackerValues = Object.fromEntries(
		Object.entries(data.trackerValues).filter(
			([key]) =>
				!sourceTrackers.some((tracker) => key === `${tracker.id}:${source.id}`),
		),
	);
	for (const tracker of sourceTrackers)
		trackerValues[`${tracker.id}:${target.id}`] =
			data.trackerValues[`${tracker.id}:${target.id}`] ??
			data.trackerValues[`${tracker.id}:${source.id}`] ??
			"";
	const totals = { ...data.paymentTotals };
	if (sourceCharge || targetCharge || payments.length) {
		totals[target.id] =
			(data.paymentTotals?.[source.id] ??
				data.payments
					.filter((row) => row.personId === source.id)
					.reduce((sum, row) => sum + row.amount, 0)) +
			(data.paymentTotals?.[target.id] ??
				data.payments
					.filter((row) => row.personId === target.id)
					.reduce((sum, row) => sum + row.amount, 0));
		delete totals[source.id];
	}
	const next: AppData = {
		...data,
		programs: clubPrograms(data).map((program) =>
			source.programs.includes(program.id) ||
			target.programs.includes(program.id)
				? { ...program, revision: program.revision + 1 }
				: program,
		),
		members: data.members.map((member) =>
			member.id === target.id
				? {
						...member,
						programs: [...new Set([...target.programs, ...source.programs])],
					}
				: member,
		),
		events: data.events.map((event) =>
			mergedEvent(event, source.id, target.id),
		),
		responses: data.responses.map((row) =>
			row.personId === source.id ? { ...row, personId: target.id } : row,
		),
		feedback: data.feedback.map((row) =>
			row.personId === source.id ? { ...row, personId: target.id } : row,
		),
		loans: data.loans.map((row) =>
			row.personId === source.id ? { ...row, personId: target.id } : row,
		),
		payments: data.payments.map((row) =>
			row.personId === source.id ? { ...row, personId: target.id } : row,
		),
		charges: [
			...data.charges.filter(
				(row) => row.personId !== source.id && row.personId !== target.id,
			),
			...(sourceCharge || targetCharge
				? [
						{
							personId: target.id,
							amount: (targetCharge?.amount ?? 0) + (sourceCharge?.amount ?? 0),
						},
					]
				: []),
		],
		paymentTotals: totals,
		trackerValues,
		conversations: data.conversations.map((row) => ({
			...row,
			participantPersonIds: row.participantPersonIds
				? replaceMergedPerson(row.participantPersonIds, source.id, target.id)
				: undefined,
		})),
	};
	return {
		next: conflicts.length ? data : next,
		conflicts,
		counts: [
			{ label: "Attendance responses relinked", count: responses.length },
			{
				label: "Coaching feedback and shoutouts relinked",
				count: feedback.length,
			},
			{ label: "Equipment loans relinked", count: loans.length },
			{ label: "Payment history relinked", count: payments.length },
			{
				label: "Current dues summaries reconciled",
				count: sourceCharge ? 1 : 0,
			},
			{ label: "Tracker values relinked", count: sourceTrackers.length },
			{ label: "Event rosters relinked", count: affectedEvents.length },
			{
				label: "Conversation person labels relinked",
				count: conversations.length,
			},
			{
				label: "Program memberships added",
				count: source.programs.filter((id) => !target.programs.includes(id))
					.length,
			},
			{
				label: "Program roster revisions refreshed",
				count: clubPrograms(data).filter(
					(program) =>
						source.programs.includes(program.id) ||
						target.programs.includes(program.id),
				).length,
			},
		],
	};
};
