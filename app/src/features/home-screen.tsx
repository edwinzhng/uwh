import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { HomeWorkspace } from "../backend/home-workspace";
import { useApp } from "../demo/app-state";
import {
	HomeCardTreatmentContext,
	homeCardTreatment,
	TabContent,
} from "../design-system";
import { canCoach } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { HomeDashboard } from "./home-dashboard";
import { useClubNow } from "./use-club-now";

const HomeContent = (): ReactElement => {
	const { account } = useApp();
	const params = useLocalSearchParams<{ reviewCards?: string }>();
	const treatment =
		process.env.EXPO_PUBLIC_REVIEW_MODE === "true" && params.reviewCards
			? homeCardTreatment(params.reviewCards)
			: undefined;
	const workspace = canCoach(account) ? "coaching" : "personal";

	const now = useClubNow();
	return (
		<ClubShell title="Summary">
			<TabContent value={workspace}>
				<HomeCardTreatmentContext value={treatment}>
					<HomeDashboard now={now} view={workspace} />
				</HomeCardTreatmentContext>
			</TabContent>
		</ClubShell>
	);
};

export const HomeScreen = (): ReactElement => (
	<HomeWorkspace>
		<HomeContent />
	</HomeWorkspace>
);
