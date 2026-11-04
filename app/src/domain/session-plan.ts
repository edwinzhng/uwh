import type { Account, ClubEvent, Member } from "./app-types";
import { canRegister } from "./event-eligibility";
import { resourceUrl } from "./resources";

export type SessionPlanImage = {
	id: string;
	label: string;
	source: "image";
	fileId: string;
};
export type SessionPlanMedia =
	| SessionPlanImage
	| { id: string; label: string; source: "link"; url: string }
	| { id: string; label: string; source: "resource"; resourceId: string };
export type SessionPlanDraft = {
	body: string;
	media: SessionPlanMedia[];
	notes: string;
};
export type SessionPlan = SessionPlanDraft & {
	revision: number;
	updatedAt?: number;
	published?: boolean;
	publishedAt?: number;
};
export type SharedSessionPlan = Pick<SessionPlanDraft, "body" | "media"> & {
	revision: number;
	publishedAt: number;
};
export type SessionPlanPublication = {
	eventId: string;
	partId?: string;
	revision: number;
	requestId: string;
	published: boolean;
};
export type SessionPlanCommand = SessionPlanDraft & {
	eventId: string;
	partId?: string;
	revision: number;
	requestId: string;
};
export const emptySessionPlan = (): SessionPlan => ({
	body: "",
	notes: "",
	media: [],
	revision: 0,
});
export const maxSessionPlanBodyLength = 20000;
export const maxSessionPlanMedia = 20;
export const validateSessionPlan = (
	draft: SessionPlanDraft,
): string | undefined => {
	if (draft.body.length > maxSessionPlanBodyLength)
		return "Keep the plan to 20,000 characters";
	if (draft.notes.length > 10000) return "Keep notes to 10,000 characters";
	if (draft.media.length > maxSessionPlanMedia) return "Attach up to 20 items";
	const ids = draft.media.map((media) => media.id);
	if (
		new Set(ids).size !== ids.length ||
		ids.some((id) => !id.trim() || id.length > 128)
	)
		return "Use unique attachment IDs";
	for (const media of draft.media) {
		if (media.source !== "image") return "Plans support uploaded images only.";
		if (!media.fileId.trim() || media.fileId.length > 128)
			return "Choose an uploaded image.";
		if (!draft.body.includes(planImageMarker(media.id)))
			return "Insert each image in the plan.";
		if (!media.label.trim() || media.label.trim().length > 120)
			return "Use an attachment name of 1–120 characters";
	}
	const markers = Array.from(
		draft.body.matchAll(/\[\[plan-image:([^\]]+)\]\]/g),
		(match) => match.at(1),
	);
	if (
		markers.length !== ids.length ||
		markers.some((id) => !ids.includes(id ?? ""))
	)
		return "Insert each image once in the plan.";
	return undefined;
};
export const normalizeSessionPlan = (
	draft: SessionPlanDraft,
): SessionPlanDraft => ({
	body: draft.body.trim(),
	notes: draft.notes.trim(),
	media: draft.media.map((media) =>
		media.source === "link"
			? {
					...media,
					label: media.label.trim(),
					url: resourceUrl(media.url.trim()) ?? media.url,
				}
			: { ...media, label: media.label.trim() },
	),
});
export const sameSessionPlan = (
	left: SessionPlanDraft,
	right: SessionPlanDraft,
): boolean =>
	JSON.stringify(normalizeSessionPlan(left)) ===
	JSON.stringify(normalizeSessionPlan(right));
export const sessionPlanRequestPayload = (
	command: SessionPlanCommand,
): string =>
	JSON.stringify({
		eventId: command.eventId,
		partId: command.partId,
		...normalizeSessionPlan(command),
	});
export const nextSessionPlan = (
	current: SessionPlan,
	command: SessionPlanCommand,
	now: number,
): SessionPlan => {
	const issue = validateSessionPlan(command);
	if (issue) throw new Error(issue);
	if (command.revision !== current.revision)
		throw new Error("Session plan changed. Reopen it; your draft is kept.");
	return {
		...normalizeSessionPlan(command),
		revision: current.revision + 1,
		updatedAt: now,
		published: current.published,
		publishedAt: current.publishedAt,
	};
};
export const canReadSharedSessionPlan = (
	account: Account,
	event: ClubEvent,
	members: readonly Member[],
): boolean =>
	!event.cancelled &&
	!["social", "meeting"].includes(event.kind) &&
	(account.admin ||
		account.coachPrograms.length > 0 ||
		members.some(
			(person) =>
				[account.personId, ...account.children].includes(person.id) &&
				canRegister(person, event) &&
				(event.eligiblePersonIds !== undefined ||
					event.program === "all" ||
					person.programs.includes(event.program)),
		));
export const planResourceIds = (
	plan: Pick<SessionPlanDraft, "media">,
): string[] => [
	...new Set(
		plan.media.flatMap((media) =>
			media.source === "resource" ? [media.resourceId] : [],
		),
	),
];
export const sharedSessionPlan = (
	plan: SessionPlan,
	canReadMedia: (resourceId: string) => boolean,
): SharedSessionPlan | undefined =>
	plan.published && plan.publishedAt !== undefined
		? {
				body: plan.body,
				media: plan.media.filter(
					(media) =>
						media.source !== "resource" || canReadMedia(media.resourceId),
				),
				revision: plan.revision,
				publishedAt: plan.publishedAt,
			}
		: undefined;
export const sessionPlanPublicationPayload = (
	command: SessionPlanPublication,
): string =>
	JSON.stringify({
		type: "publish",
		eventId: command.eventId,
		partId: command.partId,
		published: command.published,
	});
export const publishSessionPlan = (
	current: SessionPlan,
	command: SessionPlanPublication,
	now: number,
): SessionPlan => {
	if (current.revision !== command.revision)
		throw new Error(
			"The session plan changed. Review the latest version before publishing.",
		);
	if (command.published && !current.body.trim() && !current.media.length)
		throw new Error(
			"Add a plan or attachment before publishing. Coaching notes stay private.",
		);
	if (Boolean(current.published) === command.published) return current;
	return {
		...current,
		published: command.published,
		publishedAt: command.published ? now : undefined,
		revision: current.revision + 1,
		updatedAt: now,
	};
};
export const hasSessionPlanContent = (plan: SessionPlan): boolean =>
	Boolean(
		plan.body ||
			plan.notes ||
			plan.media.length ||
			plan.revision ||
			plan.published,
	);

export const planImageMarker = (id: string): string => `[[plan-image:${id}]]`;
export type PlanBodyBlock = {
	id: string;
	text: string;
	image?: SessionPlanImage;
};
export const planBodyBlocks = (
	plan: Pick<SessionPlanDraft, "body" | "media">,
): PlanBodyBlock[] => {
	const parts = plan.body.split(/(\[\[plan-image:[^\]]+\]\])/);
	return parts.map((text, index) => ({
		id: String(index),
		text: text.startsWith("[[plan-image:") ? "" : text,
		image: plan.media.find(
			(media): media is SessionPlanImage =>
				media.source === "image" && planImageMarker(media.id) === text,
		),
	}));
};

export const canReadSessionPlanImage = (
	account: Account,
	event: ClubEvent,
	members: readonly Member[],
	plan: SessionPlan,
	fileId: string,
): boolean =>
	plan.media.some(
		(image) => image.source === "image" && image.fileId === fileId,
	) &&
	(account.coachPrograms.length > 0 ||
		Boolean(
			plan.published && canReadSharedSessionPlan(account, event, members),
		));
