import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState } from "../design-system";
import { ClubShell } from "./club-shell";
import { DevelopmentLive } from "./development-live";
import { DevelopmentPreview } from "./development-preview";
import { DevelopmentReviewers } from "./development-reviewers";

export const DevelopmentScreen = (): ReactElement => {
	const { account, source } = useApp();
	const { person } = useLocalSearchParams<{ person?: string }>();
	return (
		<ClubShell title="Player reviews">
			{account.coachPrograms.length > 0 && !person ? (
				<DevelopmentReviewers />
			) : undefined}
			{account.coachPrograms.length === 0 ? (
				<EmptyState
					title="Coach access required"
					description="Player ratings and review drafts are private to coaches."
				/>
			) : source === "convex" ? (
				<DevelopmentLive personId={person} />
			) : (
				<DevelopmentPreview personId={person} />
			)}
		</ClubShell>
	);
};
