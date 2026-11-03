import type { Account, ClubEvent, Member } from "./app-types";
import { canRegister } from "./event-eligibility";
import { resourceUrl } from "./resources";

export type SessionPlanMedia =
	| { id: string; label: string; source: "link"; url: string }
	| { id: string; label: string; source: "resource"; resourceId: string };
export type SessionDrill = {
	id: string;
	title: string;
	minutes: number;
	instructions: string;
	media: SessionPlanMedia[];
};
export type SessionPlanDraft = {
	body?: string;
	goals?: string;
	objective: string;
	notes: string;
	drills: SessionDrill[];
};
export type SessionPlan = SessionPlanDraft & {
	revision: number;
	updatedAt?: number;
	published?: boolean;
	publishedAt?: number;
};
export type SharedSessionPlan = Pick<
	SessionPlanDraft,
	"objective" | "drills" | "body" | "goals"
> & {
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
export const emptySessionPlan = (notes = ""): SessionPlan => ({
	objective: "",
	notes,
	drills: [],
	revision: 0,
});
export const validateSessionPlan = (
	draft: SessionPlanDraft,
): string | undefined => {
	if ((draft.body?.length ?? 0) > 20000)
		return "Keep the plan to 20,000 characters";
	if ((draft.goals?.length ?? 0) > 10000)
		return "Keep goals to 10,000 characters";
	if (draft.objective.trim().length > 300)
		return "Keep the objective to 300 characters";
	if (draft.notes.length > 10000) return "Keep notes to 10,000 characters";
	if (draft.drills.length > 20) return "Use up to 20 drills";
	const ids = draft.drills.flatMap((drill) => [
		drill.id,
		...drill.media.map((media) => media.id),
	]);
	if (
		new Set(ids).size !== ids.length ||
		ids.some((id) => !id.trim() || id.length > 128)
	)
		return "Use unique drill and attachment IDs";
	for (const drill of draft.drills) {
		if (!drill.title.trim()) return "Add a drill name";
		if (drill.title.trim().length > 120)
			return "Keep drill names to 120 characters";
		if (
			!Number.isInteger(drill.minutes) ||
			drill.minutes < 1 ||
			drill.minutes > 240
		)
			return "Use 1–240 minutes per drill";
		if (drill.instructions.length > 2000)
			return "Keep drill instructions to 2,000 characters";
		if (drill.media.length > 6) return "Attach up to 6 items per drill";
		for (const media of drill.media) {
			if (!media.label.trim()) return "Add an attachment name";
			if (media.label.trim().length > 120)
				return "Keep attachment names to 120 characters";
			if (media.source === "link") {
				if (media.url.length > 2048 || !resourceUrl(media.url.trim()))
					return "Use a complete HTTPS link";
			} else if (media.resourceId.length > 128 || !media.resourceId.trim())
				return "Choose a club resource";
		}
	}
	return undefined;
};
export const normalizeSessionPlan = (
	draft: SessionPlanDraft,
): SessionPlanDraft => ({
	...(draft.body !== undefined ? { body: draft.body.trim() } : {}),
	...(draft.goals !== undefined ? { goals: draft.goals.trim() } : {}),
	objective: draft.objective.trim(),
	notes: draft.notes.trim(),
	drills: draft.drills.map((drill) => ({
		id: drill.id,
		title: drill.title.trim(),
		minutes: drill.minutes,
		instructions: drill.instructions.trim(),
		media: drill.media.map((media) =>
			media.source === "link"
				? {
						id: media.id,
						source: media.source,
						label: media.label.trim(),
						url: resourceUrl(media.url.trim()) ?? media.url,
					}
				: {
						id: media.id,
						source: media.source,
						label: media.label.trim(),
						resourceId: media.resourceId,
					},
		),
	})),
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
		published: false,
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
	plan: Pick<SessionPlanDraft, "drills">,
): string[] => [
	...new Set(
		plan.drills.flatMap((drill) =>
			drill.media.flatMap((media) =>
				media.source === "resource" ? [media.resourceId] : [],
			),
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
				goals: plan.goals,
				objective: plan.objective,
				drills: plan.drills.map((drill) => ({
					...drill,
					media: drill.media.filter(
						(media) =>
							media.source === "link" || canReadMedia(media.resourceId),
					),
				})),
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
	if (
		command.published &&
		!current.body &&
		!current.goals &&
		!current.objective &&
		!current.drills.length
	)
		throw new Error(
			"Add a plan or goals before publishing. Coaching notes stay private.",
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
export const planMinutes = (plan: Pick<SessionPlanDraft, "drills">): number =>
	plan.drills.reduce((total, drill) => total + drill.minutes, 0);
export const moveSessionDrill = (
	drills: SessionDrill[],
	id: string,
	direction: -1 | 1,
): SessionDrill[] => {
	const index = drills.findIndex((drill) => drill.id === id);
	const target = drills.at(index + direction);
	const current = drills.at(index);
	if (index < 0 || index + direction < 0 || !current || !target) return drills;
	return drills.map((drill, position) =>
		position === index
			? target
			: position === index + direction
				? current
				: drill,
	);
};
