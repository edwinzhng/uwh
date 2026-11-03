import { canReadThread, canRegister } from "./app-rules";
import type {
	Account,
	ClubEvent,
	CoachingFeedback,
	Conversation,
	EventResponse,
	Member,
	Message,
	Notice,
	TeamPlan,
} from "./app-types";
import { feedbackKind } from "./feedback-access";
import { conversationKind } from "./messaging";
import type { NotificationTopic } from "./notification-preferences";
import {
	canReadResource,
	type Resource,
	type ResourceActor,
} from "./resources";
import { canReadSharedSessionPlan } from "./session-plan";
import { shoutoutLabel } from "./shoutouts";

export type InboxKind = "messages" | "events" | "feedback" | "announcements";
export type InboxSource = {
	kind: InboxKind;
	topic?: NotificationTopic;
	relatedId?: string;
	partId?: string;
	sourceRevision?: number;
	staffOnly?: boolean;
	entityId: string;
	actorId?: string;
	eventPhase?: "created" | "open" | "closing" | "changed" | "cancelled";
	eventTimestamp?: number;
	eventIds?: string[];
};
export type InboxTarget =
	| { kind: "message"; threadId: string; messageId: string }
	| {
			kind: "event";
			eventId: string;
			tab?: "overview" | "coaching" | "people";
			partId?: string;
	  }
	| {
			kind: "feedback";
			personId: string;
			tab: "progress" | "feedback" | "shoutouts";
	  }
	| { kind: "resource"; resourceId: string }
	| { kind: "announcement"; noticeId: string };
export type InboxContent = {
	kind: InboxKind;
	topic?: NotificationTopic;
	title: string;
	description: string;
	target: InboxTarget;
};
export type InboxItem = InboxContent & {
	id: string;
	createdAt: number;
	readAt?: number;
};
export type InboxContext = {
	account: Account;
	people: Member[];
	blocked: string[];
	chatPaused: boolean;
	today: string;
	now: number;
	message?: Message;
	thread?: Conversation;
	feedback?: CoachingFeedback;
	notice?: Notice;
	event?: ClubEvent;
	responses: EventResponse[];
	resource?: Resource;
	resourceActor?: ResourceActor;
	team?: TeamPlan;
	planExists?: boolean;
	planPublished?: boolean;
	response?: EventResponse;
	person?: Member;
};
export const inboxContent = (
	source: InboxSource,
	context: InboxContext,
	mode: "delivery" | "history" = "history",
): InboxContent | undefined => {
	const { account, blocked } = context;
	if (
		source.actorId === account.id ||
		(source.actorId && blocked.includes(source.actorId))
	)
		return undefined;
	const household = context.people.filter(
		(person) =>
			!person.archived &&
			!person.mergedInto &&
			[account.personId, ...account.children].includes(person.id),
	);
	if (source.topic === "video" || source.topic === "document") {
		const { resource, resourceActor } = context;
		if (
			!resource ||
			resource.archived ||
			resource.kind !== (source.topic === "video" ? "video" : "document") ||
			!resourceActor ||
			!canReadResource(resourceActor, resource)
		)
			return undefined;
		return {
			kind: source.kind,
			topic: source.topic,
			title: resource.title,
			description:
				source.topic === "video"
					? "A new video clip is available."
					: "A new team document is available.",
			target: { kind: "resource", resourceId: resource.id },
		};
	}
	if (source.topic === "goalRequest" || source.topic === "progress") {
		const { person } = context;
		if (
			!person ||
			person.archived ||
			person.mergedInto ||
			!account.coachPrograms.length
		)
			return undefined;
		if (
			source.topic === "goalRequest" &&
			(!person.pendingGoal ||
				person.pendingGoalRevision !== source.sourceRevision)
		)
			return undefined;
		return {
			kind: source.kind,
			topic: source.topic,
			title: person.name,
			description:
				source.topic === "goalRequest"
					? "A goal change is ready to review."
					: "A player shared a progress update.",
			target: { kind: "feedback", personId: person.id, tab: "progress" },
		};
	}
	if (
		source.topic === "lineup" ||
		source.topic === "sessionPlan" ||
		source.topic === "rsvpNo"
	) {
		const { event, team, response } = context;
		if (!event || event.cancelled) return undefined;
		if (
			source.topic === "sessionPlan" &&
			(!context.planExists ||
				(!account.coachPrograms.length &&
					(source.staffOnly ||
						!context.planPublished ||
						!canReadSharedSessionPlan(account, event, context.people))))
		)
			return undefined;
		if (
			source.topic === "rsvpNo" &&
			(!account.coachPrograms.length || response?.response !== "unavailable")
		)
			return undefined;
		if (
			source.topic === "lineup" &&
			(!team?.published ||
				team.coachingStale ||
				(!account.coachPrograms.length &&
					!household.some(
						(person) =>
							[
								...team.black,
								...team.white,
								...(team.blackBench ?? []),
								...(team.whiteBench ?? []),
							].includes(person.id) &&
							context.responses.some(
								(item) =>
									item.personId === person.id &&
									item.eventId === event.id &&
									item.response === "going",
							),
					)))
		)
			return undefined;
		return {
			kind: source.kind,
			topic: source.topic,
			title: event.title,
			description:
				source.topic === "lineup"
					? "Your coach published the lineup."
					: source.topic === "sessionPlan"
						? "The session plan has been updated."
						: "A player marked not attending.",
			target: {
				kind: "event",
				eventId: event.id,
				tab:
					source.topic === "lineup"
						? "overview"
						: source.topic === "sessionPlan"
							? account.coachPrograms.length
								? "coaching"
								: "overview"
							: "people",
				partId: source.partId,
			},
		};
	}
	if (source.kind === "messages") {
		const { message, thread } = context;
		if (
			!message ||
			message.deleted ||
			message.id !== source.entityId ||
			!thread ||
			thread.id !== message.threadId ||
			!canReadThread(account, thread) ||
			context.chatPaused ||
			blocked.includes(message.accountId) ||
			(["direct", "group"].includes(conversationKind(thread)) &&
				thread.accountIds.some((id) => blocked.includes(id)))
		)
			return undefined;
		return {
			kind: source.kind,
			topic:
				source.topic ??
				(conversationKind(thread) === "staff"
					? "coachMessage"
					: conversationKind(thread) === "direct"
						? "directMessage"
						: "groupMessage"),
			title: thread.title,
			description: `${message.author}: ${message.body || (message.images?.length ? "Photo" : "New message")}`,
			target: {
				kind: "message",
				threadId: thread.id,
				messageId: message.id,
			},
		};
	}
	if (source.kind === "feedback") {
		const { feedback } = context;
		const person = household.find((entry) => entry.id === feedback?.personId);
		if (
			!feedback ||
			feedback.id !== source.entityId ||
			feedback.visibility !== "published" ||
			blocked.includes(feedback.authorId) ||
			!person
		)
			return undefined;
		const shoutout = feedbackKind(feedback) === "shoutout";
		return {
			kind: source.kind,
			topic: shoutout ? "shoutout" : "coachingFeedback",
			title: `${person.name} · ${shoutout ? "Shoutout" : "Coaching feedback"}`,
			description:
				feedback.body || (shoutout ? shoutoutLabel(feedback.category) : ""),
			target: {
				kind: "feedback",
				personId: feedback.personId,
				tab: shoutout ? "shoutouts" : "feedback",
			},
		};
	}
	if (source.kind === "announcements") {
		const { notice } = context;
		if (
			!notice ||
			notice.id !== source.entityId ||
			(notice.expiresAt && notice.expiresAt <= context.today) ||
			(!account.admin &&
				notice.program !== "all" &&
				!account.coachPrograms.includes(notice.program) &&
				!household.some((person) => person.programs.includes(notice.program)))
		)
			return undefined;
		return {
			kind: source.kind,
			title: notice.title,
			description: notice.body,
			target: { kind: "announcement", noticeId: notice.id },
		};
	}
	const { event } = context;
	if (!event || event.id !== source.entityId) return undefined;
	const people = household.filter((person) => canRegister(person, event));
	if (mode === "delivery") {
		if (source.eventPhase === "created") {
			if (event.cancelled || !people.length) return undefined;
		} else if (
			source.eventPhase === "changed" ||
			source.eventPhase === "cancelled"
		) {
			const ids = source.eventIds ?? [event.id];
			if (
				(source.eventPhase === "cancelled") !== event.cancelled ||
				!context.responses.some(
					(response) =>
						ids.includes(response.eventId) &&
						household.some((person) => person.id === response.personId) &&
						["going", "waiting"].includes(response.response),
				)
			)
				return undefined;
		} else if (
			event.cancelled ||
			!event.closesAt ||
			context.now >= event.closesAt ||
			(event.opensAt && context.now < event.opensAt) ||
			(source.eventPhase === "open" ? event.opensAt : event.closesAt) !==
				source.eventTimestamp ||
			!people.some(
				(person) =>
					!context.responses.some(
						(response) =>
							response.eventId === event.id &&
							response.personId === person.id &&
							response.response !== "unanswered",
					),
			)
		)
			return undefined;
	} else if (
		!people.length &&
		!account.admin &&
		!account.coachPrograms.includes(event.program)
	)
		return undefined;
	const description =
		source.eventPhase === "created"
			? "A new event was added."
			: source.eventPhase === "open"
				? "Registration is open."
				: source.eventPhase === "changed"
					? "An event you signed up for has changed."
					: source.eventPhase === "cancelled"
						? "An event you signed up for was cancelled."
						: "Registration closes soon.";
	return {
		kind: source.kind,
		title: event.title,
		description: `${description} ${event.date} · ${event.start} · ${event.venue}`,
		target: { kind: "event", eventId: event.id },
	};
};
export const inboxRoute = (
	target: InboxTarget,
):
	| { pathname: "/conversation"; params: { id: string } }
	| {
			pathname: "/session";
			params: { event: string; tab?: string; part?: string };
	  }
	| { pathname: "/resources"; params: { id: string } }
	| {
			pathname: "/member";
			params: { id: string; tab: "goals" | "feedback" | "shoutouts" };
	  }
	| { pathname: "/announcements"; params: Record<string, never> } => {
	if (target.kind === "message")
		return { pathname: "/conversation", params: { id: target.threadId } };
	if (target.kind === "event")
		return {
			pathname: "/session",
			params: {
				event: target.eventId,
				...(target.tab ? { tab: target.tab } : {}),
				...(target.partId ? { part: target.partId } : {}),
			},
		};
	if (target.kind === "resource")
		return { pathname: "/resources", params: { id: target.resourceId } };
	if (target.kind === "feedback")
		return {
			pathname: "/member",
			params: {
				id: target.personId,
				tab: target.tab === "progress" ? "goals" : target.tab,
			},
		};
	return { pathname: "/announcements", params: {} };
};
