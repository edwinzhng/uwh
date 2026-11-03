import { atom } from "jotai";
import { practicePartKey } from "../domain/practice-parts";
import {
	canReadResource,
	resourceHouseholdPrograms,
} from "../domain/resources";
import {
	canReadSharedSessionPlan,
	emptySessionPlan,
	nextSessionPlan,
	publishSessionPlan,
	type SessionPlan,
	type SessionPlanCommand,
	type SessionPlanPublication,
	type SharedSessionPlan,
	sessionPlanPublicationPayload,
	sessionPlanRequestPayload,
	sharedSessionPlan,
} from "../domain/session-plan";
import { previewAccountAtom, previewDataAtom } from "./app-state";
import { previewResources } from "./resource-state";

const seed: SessionPlan = {
	objective: "Find support before the first touch",
	notes:
		"Rotate partners between drills. Keep the first round at a comfortable pace.",
	revision: 0,
	drills: [
		{
			id: "passing-warmup",
			title: "Passing lanes",
			minutes: 10,
			instructions:
				"Work in threes. Move into an open passing lane before calling for the puck.",
			media: [
				{
					id: "passing-reference",
					label: "Practice resources",
					source: "resource",
					resourceId: "practice-resources",
				},
			],
		},
		{
			id: "support-drill",
			title: "Support under pressure",
			minutes: 15,
			instructions:
				"Play three on two. Stop after each turnover and identify the available support option.",
			media: [
				{
					id: "support-replay",
					label: "Demo uploaded video",
					source: "resource",
					resourceId: "demo-uploaded-video",
				},
			],
		},
	],
};
export const previewSessionPlansAtom = atom<Record<string, SessionPlan>>({
	[practicePartKey("club-thu")]: {
		...seed,
		revision: 1,
		published: true,
		publishedAt: 1790000000000,
	},
	[practicePartKey("club-thu", "training")]: seed,
});
export const previewSharedSessionPlansAtom = atom(
	(get): Record<string, SharedSessionPlan> => {
		const account = get(previewAccountAtom);
		const data = get(previewDataAtom);
		const plans = get(previewSessionPlansAtom);
		const actor = {
			...account,
			clubId: "preview",
			programIds: resourceHouseholdPrograms(account, data.members),
		};
		const resources = get(previewResources).filter(
			(resource) => !resource.archived && canReadResource(actor, resource),
		);
		return Object.fromEntries(
			data.events.flatMap((event) => {
				if (!canReadSharedSessionPlan(account, event, data.members)) return [];
				return [
					undefined,
					...(event.parts?.map((part) => part.id) ?? []),
				].flatMap((partId) => {
					const key = practicePartKey(event.id, partId);
					const plan = plans[key];
					const shared = plan
						? sharedSessionPlan(plan, (id) =>
								resources.some((resource) => resource.id === id),
							)
						: undefined;
					return shared ? [[key, shared]] : [];
				});
			}),
		);
	},
);
const previewPlanRequestsAtom = atom<Record<string, string>>({});
export const previewSessionPlanCommandAtom = atom(
	undefined,
	(get, set, command: SessionPlanCommand): void => {
		const account = get(previewAccountAtom);
		if (!account.coachPrograms.length)
			throw new Error("Coach access required.");
		const data = get(previewDataAtom);
		const event = data.events.find((entry) => entry.id === command.eventId);
		if (
			!event ||
			event.cancelled ||
			["social", "meeting"].includes(event.kind) ||
			(command.partId &&
				!event.parts?.some((part) => part.id === command.partId))
		)
			throw new Error("Choose a current practice and valid practice part.");
		if (command.requestId.length < 16 || command.requestId.length > 128)
			throw new Error("Reopen the plan and retry.");
		const requestKey = `${account.id}:${command.requestId}`;
		const requests = get(previewPlanRequestsAtom);
		const payload = sessionPlanRequestPayload(command);
		if (requests[requestKey]) {
			if (requests[requestKey] !== payload)
				throw new Error(
					"This request was already used for a different session plan.",
				);
			return;
		}
		const key = practicePartKey(command.eventId, command.partId);
		const plans = get(previewSessionPlansAtom);
		const next = nextSessionPlan(
			plans[key] ?? emptySessionPlan(data.plans[key]),
			command,
			Date.now(),
		);
		const resources = get(previewResources);
		if (
			next.drills.some((drill) =>
				drill.media.some(
					(media) =>
						media.source === "resource" &&
						!resources.some(
							(resource) =>
								resource.id === media.resourceId &&
								!resource.archived &&
								canReadResource(
									{
										...account,
										clubId: "preview",
										programIds: resourceHouseholdPrograms(
											account,
											data.members,
										),
									},
									resource,
								),
						),
				),
			)
		)
			throw new Error("A selected resource is unavailable.");
		set(previewSessionPlansAtom, { ...plans, [key]: next });
		set(previewPlanRequestsAtom, { ...requests, [requestKey]: payload });
	},
);
export const previewSessionPlanPublicationAtom = atom(
	undefined,
	(get, set, command: SessionPlanPublication): void => {
		const actor = get(previewAccountAtom);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		const data = get(previewDataAtom);
		const event = data.events.find((entry) => entry.id === command.eventId);
		if (
			!event ||
			event.cancelled ||
			["social", "meeting"].includes(event.kind) ||
			(command.partId &&
				!event.parts?.some((part) => part.id === command.partId))
		)
			throw new Error("Choose a current practice and valid practice part.");
		if (command.requestId.length < 16 || command.requestId.length > 128)
			throw new Error("Reopen the plan and retry.");
		const requestKey = `${actor.id}:${command.requestId}`;
		const requests = get(previewPlanRequestsAtom);
		const payload = sessionPlanPublicationPayload(command);
		if (requests[requestKey]) {
			if (requests[requestKey] !== payload)
				throw new Error(
					"This request was already used for another session plan action.",
				);
			return;
		}
		const key = practicePartKey(command.eventId, command.partId);
		const plans = get(previewSessionPlansAtom);
		const plan = plans[key];
		if (!plan) throw new Error("Save the session plan before publishing.");
		const next = publishSessionPlan(plan, command, Date.now());
		if (
			command.published &&
			next.drills.some((drill) =>
				drill.media.some(
					(media) =>
						media.source === "resource" &&
						!get(previewResources).some(
							(resource) =>
								resource.id === media.resourceId &&
								!resource.archived &&
								canReadResource({ ...actor, clubId: "preview" }, resource),
						),
				),
			)
		)
			throw new Error("A selected resource is unavailable.");
		set(previewSessionPlansAtom, { ...plans, [key]: next });
		set(previewPlanRequestsAtom, { ...requests, [requestKey]: payload });
	},
);
