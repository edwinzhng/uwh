import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { HomeWorkspace } from "../backend/home-workspace";
import { useApp } from "../demo/app-state";
import {
	HomeCardTreatmentContext,
	homeCardTreatment,
	TabContent,
	useRouteSelection,
} from "../design-system";
import { canCoach } from "../domain/app-rules";
import { nextCoachingEvent } from "../domain/home";
import { ClubShell } from "./club-shell";
import { CoachDashboard } from "./coach-dashboard";
import { HomeSummary } from "./home-summary";
import { homeView, homeWorkspaceAtom } from "./home-workspace-state";
import { useClubNow } from "./use-club-now";

const HomeContent = (): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const params = useLocalSearchParams<{
		view?: string;
		reviewCards?: string;
	}>();
	const treatment =
		process.env.EXPO_PUBLIC_REVIEW_MODE === "true" && params.reviewCards
			? homeCardTreatment(params.reviewCards)
			: undefined;
	const [workspaces, setWorkspaces] = useAtom(homeWorkspaceAtom);
	const routeWorkspace = homeView(
		canCoach(account),
		params.view,
		workspaces[account.id],
	);
	const selection = useRouteSelection(
		routeWorkspace,
		(value): void => {
			setWorkspaces((current) => ({ ...current, [account.id]: value }));
			router.setParams({ view: value });
		},
		account.id,
	);
	const workspace = canCoach(account) ? selection.value : "personal";

	const now = useClubNow();
	const coaching = nextCoachingEvent(data, account, now);
	return (
		<ClubShell title="Summary">
			<TabContent value={workspace}>
				{workspace === "coaching" ? (
					<CoachDashboard nextPractice={coaching} />
				) : (
					<HomeCardTreatmentContext value={treatment}>
						<HomeSummary now={now} />
					</HomeCardTreatmentContext>
				)}
			</TabContent>
		</ClubShell>
	);
};

export const HomeScreen = (): ReactElement => (
	<HomeWorkspace>
		<HomeContent />
	</HomeWorkspace>
);
