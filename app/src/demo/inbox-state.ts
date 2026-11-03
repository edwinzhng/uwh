import { atom } from "jotai";
import type { Account, AppData } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import {
	type InboxItem,
	type InboxSource,
	inboxContent,
} from "../domain/inbox";
import { practicePartKey } from "../domain/practice-parts";
import { type Resource, resourceHouseholdPrograms } from "../domain/resources";
import type { SessionPlan } from "../domain/session-plan";

export const previewInboxReads = atom<Record<string, number | undefined>>({});
export type PreviewInboxSource = InboxSource & {
	id: string;
	createdAt: number;
};
const previewTimestamp = (value: string | number | undefined): number => {
	const timestamp = typeof value === "number" ? value : Date.parse(value ?? "");
	return Number.isFinite(timestamp)
		? Math.min(timestamp, 1792886400000)
		: 1792886400000;
};
export const previewInboxSources = (
	data: AppData,
	resources: Resource[] = [],
	plans: Record<string, SessionPlan> = {},
): PreviewInboxSource[] => [
	...data.messages.map((message) => ({
		id: `message:${message.id}`,
		kind: "messages" as const,
		entityId: message.id,
		actorId: message.accountId,
		createdAt: previewTimestamp(undefined),
	})),
	...data.feedback.map((feedback) => ({
		id: `feedback:${feedback.id}`,
		kind: "feedback" as const,
		entityId: feedback.id,
		actorId: feedback.authorId,
		createdAt: previewTimestamp(feedback.date),
	})),
	...data.notices.map((notice) => ({
		id: `notice:${notice.id}`,
		kind: "announcements" as const,
		entityId: notice.id,
		createdAt: previewTimestamp(notice.postedAt ?? notice.date),
	})),
	...data.events.map((event) => ({
		id: `event:${event.id}:${event.editId ?? "open"}:${event.cancelled}`,
		kind: "events" as const,
		entityId: event.id,
		eventPhase: event.cancelled
			? ("cancelled" as const)
			: event.editId
				? ("changed" as const)
				: ("open" as const),
		createdAt: previewTimestamp(event.opensAt ?? event.date),
	})),
	...resources.map((resource) => ({
		id: `resource:${resource.id}`,
		kind: "announcements" as const,
		topic:
			resource.kind === "video" ? ("video" as const) : ("document" as const),
		entityId: resource.id,
		createdAt: previewTimestamp(resource.updatedAt),
	})),
	...data.teams
		.filter((team) => team.published)
		.map((team) => ({
			id: `lineup:${practicePartKey(team.eventId, team.partId)}:${team.revision ?? 0}`,
			kind: "events" as const,
			topic: "lineup" as const,
			entityId: team.eventId,
			partId: team.partId,
			createdAt: previewTimestamp(undefined),
		})),
	...data.events.flatMap((event) =>
		[undefined, ...(event.parts?.map((part) => part.id) ?? [])].flatMap(
			(partId): PreviewInboxSource[] => {
				const key = practicePartKey(event.id, partId);
				const plan = plans[key];
				return plan
					? [
							{
								id: `plan:${key}:${plan.revision}:${Boolean(plan.published)}`,
								kind: "events",
								topic: "sessionPlan",
								entityId: event.id,
								partId,
								staffOnly: !plan.published,
								createdAt: previewTimestamp(plan.updatedAt),
							},
						]
					: [];
			},
		),
	),
	...data.responses
		.filter((response) => response.response === "unavailable")
		.map((response) => ({
			id: `rsvp:${response.eventId}:${response.personId}`,
			kind: "events" as const,
			topic: "rsvpNo" as const,
			entityId: `${response.eventId}:${response.personId}`,
			relatedId: response.eventId,
			createdAt: previewTimestamp(undefined),
		})),
	...data.members.flatMap((person): PreviewInboxSource[] => [
		...(person.pendingGoal
			? [
					{
						id: `goal:${person.id}:${person.pendingGoalRevision ?? 0}`,
						kind: "feedback" as const,
						topic: "goalRequest" as const,
						entityId: person.id,
						sourceRevision: person.pendingGoalRevision,
						createdAt: previewTimestamp(undefined),
					},
				]
			: []),
		...(person.steps
			? [
					{
						id: `progress:${person.id}:${person.steps}`,
						kind: "feedback" as const,
						topic: "progress" as const,
						entityId: person.id,
						createdAt: previewTimestamp(undefined),
					},
				]
			: []),
	]),
];
export const previewInboxItems = (
	data: AppData,
	account: Account,
	reads: Record<string, number | undefined>,
	resources: Resource[] = [],
	plans: Record<string, SessionPlan> = {},
): InboxItem[] =>
	previewInboxSources(data, resources, plans)
		.flatMap((source): InboxItem[] => {
			const message = data.messages.find((item) => item.id === source.entityId);
			const content = inboxContent(source, {
				account,
				people: data.members,
				blocked: [],
				chatPaused: false,
				today: clubDate(undefined, data.timeZone),
				now: Date.now(),
				message,
				thread: data.conversations.find(
					(item) => item.id === message?.threadId,
				),
				feedback: data.feedback.find((item) => item.id === source.entityId),
				notice: data.notices.find((item) => item.id === source.entityId),
				event: data.events.find(
					(item) => item.id === (source.relatedId ?? source.entityId),
				),
				responses: data.responses,
				resource: resources.find((item) => item.id === source.entityId),
				resourceActor: {
					...account,
					clubId: "preview",
					programIds: resourceHouseholdPrograms(account, data.members),
				},
				team: data.teams.find(
					(item) =>
						item.eventId === source.entityId && item.partId === source.partId,
				),
				planExists: Boolean(
					plans[practicePartKey(source.entityId, source.partId)],
				),
				planPublished:
					plans[practicePartKey(source.entityId, source.partId)]?.published ===
					true,
				response: data.responses.find(
					(item) => `${item.eventId}:${item.personId}` === source.entityId,
				),
				person: data.members.find((item) => item.id === source.entityId),
			});
			return content
				? [
						{
							...content,
							id: source.id,
							createdAt: source.createdAt,
							readAt: reads[`${account.id}:${source.id}`],
						},
					]
				: [];
		})
		.slice()
		.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
