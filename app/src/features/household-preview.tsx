import { useHydrateAtoms } from "jotai/utils";
import type { ReactElement } from "react";
import { usePreviewHousehold } from "../backend/use-household";
import { useApp } from "../demo/app-state";
import {
	type PreviewHouseholdLink,
	previewHouseholdLinks,
} from "../demo/household-data";
import { HouseholdProfiles } from "./household-profiles";
import { useReviewFlow } from "./use-review-flow";

export const HouseholdPreview = (): ReactElement => {
	const reviewFlow = useReviewFlow();
	const { account } = useApp();
	const fixtures: [typeof previewHouseholdLinks, PreviewHouseholdLink[]][] =
		reviewFlow === "household-invitation"
			? [
					[
						previewHouseholdLinks,
						[
							{
								id: "fictional-guardian-invitation",
								personId: "sam",
								userId: account.id,
								createdBy: "alex",
								origin: "administrator",
								state: "available",
								key: "fictional-guardian-invitation",
								payload: "alex:sam",
							},
						],
					],
				]
			: [];
	useHydrateAtoms(new Map(fixtures));
	return <HouseholdProfiles service={usePreviewHousehold()} />;
};
