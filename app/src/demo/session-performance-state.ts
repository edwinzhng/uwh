import { atom } from "jotai";
import {
	canReadSessionPerformance,
	canReportSessionPerformance,
	canWriteSessionPerformance,
	nextSessionPerformance,
	performanceSessionEligible,
	type SessionPerformance,
	type SessionPerformanceCommand,
	sessionPerformanceAuthorKey,
	sessionPerformancePayload,
} from "../domain/session-performance";
import { previewAccountAtom, previewDataAtom } from "./app-state";

const seed = {
	personId: "sam",
	eventId: "club-thu",
	eventTitle: "Club practice",
	eventDate: "2026-09-10",
	programId: "club",
	revision: 1,
	updatedAt: 1790000000000,
};
const coachSeed: SessionPerformance = {
	...seed,
	id: "sample-coach-session-rating",
	kind: "coach",
	authorId: "alex",
	authorName: "Alex Rivera",
	rating: 7,
	comments:
		"You looked for support after each pass. Keep moving into the next open lane.",
};
export const previewSessionPerformanceAtom = atom<SessionPerformance[]>([
	coachSeed,
	{
		...seed,
		id: "sample-self-session-rating",
		kind: "self",
		authorId: "jamie",
		authorName: "Jamie Rivera",
		rating: 6,
		comments:
			"I found space more consistently and want to react sooner after a turnover.",
	},
]);
const previewPerformanceRequests = atom<
	Record<string, { payload: string; id: string }>
>({});
export const previewSessionPerformanceCommand = atom(
	undefined,
	(get, set, command: SessionPerformanceCommand): string => {
		const account = get(previewAccountAtom);
		const data = get(previewDataAtom);
		const person = data.members.find(
			(member) => member.id === command.personId,
		);
		if (
			!person ||
			!canReadSessionPerformance(account, person) ||
			!canWriteSessionPerformance(account, person, command.kind)
		)
			throw new Error("This session rating is private or read-only.");
		const event = data.events.find((event) => event.id === command.eventId);
		if (!event || !performanceSessionEligible(person, event))
			throw new Error("Choose a current, eligible practice for this player.");
		if (command.requestId.length < 16 || command.requestId.length > 128)
			throw new Error("Reopen the rating and retry.");
		const payload = sessionPerformancePayload(command);
		const key = `${account.id}:${command.requestId}`;
		const requests = get(previewPerformanceRequests);
		const receipt = requests[key];
		if (receipt) {
			if (receipt.payload !== payload)
				throw new Error(
					"This request was already used for another session rating.",
				);
			return receipt.id;
		}
		const rows = get(previewSessionPerformanceAtom);
		const row = rows.find(
			(row) =>
				row.personId === command.personId &&
				row.eventId === command.eventId &&
				row.kind === command.kind &&
				sessionPerformanceAuthorKey(row.kind, row.authorId) ===
					sessionPerformanceAuthorKey(command.kind, account.id),
		);
		if (row?.removed)
			throw new Error(
				"This feedback was removed by a club administrator and cannot be replaced.",
			);
		const next = nextSessionPerformance(
			row,
			command,
			account,
			event,
			`performance-${command.requestId}`,
			Date.now(),
		);
		set(
			previewSessionPerformanceAtom,
			row
				? rows.map((entry) => (entry.id === row.id ? next : entry))
				: [...rows, next],
		);
		set(previewPerformanceRequests, {
			...requests,
			[key]: { payload, id: next.id },
		});
		return next.id;
	},
);
export type PreviewPerformanceReport = {
	preview: true;
	_id: string;
	author: string;
	body: string;
	imageIds: string[];
	reason: string;
	state: "open" | "dismissed" | "removed";
	reporterId: string;
	subjectId: string;
	createdAt: number;
	source: {
		kind: "sessionPerformance";
		id: string;
		personId: string;
		eventId: string;
		revision: number;
		rating: number;
	};
};
export const previewPerformanceReportFixture: PreviewPerformanceReport = {
	preview: true,
	_id: "sample-session-feedback-report",
	author: coachSeed.authorName,
	body: coachSeed.comments,
	imageIds: [],
	reason: "Please review the wording of this session feedback.",
	state: "open",
	reporterId: "jamie",
	subjectId: coachSeed.authorId,
	createdAt: 1790000000000,
	source: {
		kind: "sessionPerformance",
		id: coachSeed.id,
		personId: coachSeed.personId,
		eventId: coachSeed.eventId,
		revision: coachSeed.revision,
		rating: coachSeed.rating,
	},
};
export const previewPerformanceReports = atom<PreviewPerformanceReport[]>([]);
export const previewPerformanceReportCommand = atom(
	undefined,
	(get, set, input: { id: string; revision: number; reason: string }): void => {
		const actor = get(previewAccountAtom);
		const data = get(previewDataAtom);
		const row = get(previewSessionPerformanceAtom).find(
			(entry) => entry.id === input.id,
		);
		const person = data.members.find((entry) => entry.id === row?.personId);
		if (!input.reason.trim() || input.reason.length > 1000)
			throw new Error("Add a reason under 1,000 characters.");
		if (!row || !person || !canReportSessionPerformance(actor, person, row))
			throw new Error("This session feedback is unavailable to report.");
		if (row.revision !== input.revision)
			throw new Error(
				"This feedback changed. Review the latest version before reporting; your reason is kept.",
			);
		const reports = get(previewPerformanceReports);
		if (
			reports.some(
				(report) =>
					report.reporterId === actor.id &&
					report.source.id === row.id &&
					report.source.revision === row.revision,
			)
		)
			return;
		if (
			reports.filter(
				(report) =>
					report.reporterId === actor.id &&
					report.createdAt > Date.now() - 3600000,
			).length >= 10
		)
			throw new Error("Too many reports. Try again later.");
		set(previewPerformanceReports, [
			...reports,
			{
				preview: true,
				_id: `report-${row.id}-${row.revision}-${actor.id}`,
				author: row.authorName,
				body: row.comments,
				imageIds: [],
				reason: input.reason.trim(),
				state: "open",
				reporterId: actor.id,
				subjectId: row.authorId,
				createdAt: Date.now(),
				source: {
					kind: "sessionPerformance",
					id: row.id,
					personId: row.personId,
					eventId: row.eventId,
					revision: row.revision,
					rating: row.rating,
				},
			},
		]);
	},
);
export const previewPerformanceReportReview = atom(
	undefined,
	(
		get,
		set,
		input: { id: string; decision: "dismissed" | "removed" },
	): void => {
		if (!get(previewAccountAtom).admin)
			throw new Error("Administrator access required.");
		const reports = get(previewPerformanceReports);
		const report = reports.find((row) => row._id === input.id);
		if (!report) throw new Error("Report unavailable.");
		if (report.state !== "open") return;
		const records = get(previewSessionPerformanceAtom);
		const record = records.find((row) => row.id === report.source.id);
		if (input.decision === "removed" && record && !record.removed) {
			if (record.revision !== report.source.revision)
				throw new Error(
					"This feedback changed after the report. Newer feedback was not removed.",
				);
			set(
				previewSessionPerformanceAtom,
				records.map((row) =>
					row.id === record.id
						? {
								...row,
								removed: true,
								comments: "",
								revision: row.revision + 1,
							}
						: row,
				),
			);
		}
		set(
			previewPerformanceReports,
			reports.map((row) =>
				row._id === report._id ? { ...row, state: input.decision } : row,
			),
		);
	},
);
