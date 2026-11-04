import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	previewSessionPlanCommandAtom,
	previewSessionPlanPublicationAtom,
	previewSessionPlansAtom,
	previewSharedSessionPlansAtom,
} from "../demo/session-plan-state";
import { practicePartKey } from "../domain/practice-parts";
import {
	emptySessionPlan,
	type SessionPlan,
	type SessionPlanCommand,
	type SessionPlanPublication,
	type SharedSessionPlan,
} from "../domain/session-plan";
import { createPlanImages, type PlanImages } from "./plan-images";
import { usePreviewPlanImages } from "./use-preview-plan-images";

export type SessionPlanService = {
	plan?: SessionPlan;
	images: PlanImages;
	loading: boolean;
	save: (command: SessionPlanCommand) => Promise<void>;
	publish: (command: SessionPlanPublication) => Promise<void>;
};
export const useLiveSessionPlan = (
	eventId: string,
	partId?: string,
): SessionPlanService => {
	const token = useAuthToken();
	const images = useMemo(() => createPlanImages(token ?? undefined), [token]);
	const plan = useQuery(api.session_plans.state, { eventId, partId });
	const save = useMutation(api.session_plans.save);
	const publish = useMutation(api.session_plans.publish);
	return {
		plan,
		images,
		loading: plan === undefined,
		save: async (command): Promise<void> => {
			await save(command);
		},
		publish: async (command): Promise<void> => {
			await publish(command);
		},
	};
};
export const usePreviewSessionPlan = (
	eventId: string,
	partId?: string,
): SessionPlanService => {
	const { account } = useApp();
	const images = usePreviewPlanImages();
	const plans = useAtomValue(previewSessionPlansAtom);
	const save = useSetAtom(previewSessionPlanCommandAtom);
	const publish = useSetAtom(previewSessionPlanPublicationAtom);
	const key = practicePartKey(eventId, partId);
	return {
		images,
		plan: account.coachPrograms.length
			? (plans[key] ?? emptySessionPlan())
			: undefined,
		loading: false,
		save: async (command): Promise<void> => save(command),
		publish: async (command): Promise<void> => publish(command),
	};
};
export type SharedSessionPlanService = {
	plan?: SharedSessionPlan;
	loading: boolean;
};
export const useLiveSharedSessionPlan = (
	eventId: string,
	partId?: string,
): SharedSessionPlanService => {
	const plan = useQuery(api.session_plans.shared, { eventId, partId });
	return { plan: plan ?? undefined, loading: plan === undefined };
};
export const usePreviewSharedSessionPlan = (
	eventId: string,
	partId?: string,
): SharedSessionPlanService => {
	const plans = useAtomValue(previewSharedSessionPlansAtom);
	return { plan: plans[practicePartKey(eventId, partId)], loading: false };
};
