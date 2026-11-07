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
import { ClubShell } from "./club-shell";
import { HomeDashboard } from "./home-dashboard";
import { homeView, homeWorkspaceAtom } from "./home-workspace-state";
import { useClubNow } from "./use-club-now";

const HomeContent = (): ReactElement => {
	const { account } = useApp();
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
