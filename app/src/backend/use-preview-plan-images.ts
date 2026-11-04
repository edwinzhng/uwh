import { useStore } from "jotai";
import { useMemo } from "react";
import { previewAccountAtom, previewDataAtom } from "../demo/app-state";
import { previewSessionPlansAtom } from "../demo/session-plan-state";
import { practicePartKey } from "../domain/practice-parts";
import { canReadSessionPlanImage } from "../domain/session-plan";
import { createPreviewPlanImages, type PlanImages } from "./plan-images";

export const usePreviewPlanImages = (): PlanImages => {
	const store = useStore();
	return useMemo(
		() =>
			createPreviewPlanImages({
				actorId: (): string => store.get(previewAccountAtom).id,
				canUpload: (): boolean =>
					store.get(previewAccountAtom).coachPrograms.length > 0,
				canRead: (fileId, ownerId): boolean => {
					const account = store.get(previewAccountAtom);
					if (account.coachPrograms.length && account.id === ownerId)
						return true;
					const data = store.get(previewDataAtom);
					const plans = store.get(previewSessionPlansAtom);
					return data.events.some((event) =>
						[undefined, ...(event.parts?.map((part) => part.id) ?? [])].some(
							(partId) => {
								const plan = plans[practicePartKey(event.id, partId)];
								return Boolean(
									plan &&
										canReadSessionPlanImage(
											account,
											event,
											data.members,
											plan,
											fileId,
										),
								);
							},
						),
					);
				},
			}),
		[store],
	);
};
