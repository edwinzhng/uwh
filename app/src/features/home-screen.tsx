import { useLocalSearchParams, useRouter } from "expo-router";
import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import { HomeWorkspace } from "../backend/home-workspace";
import { useApp } from "../demo/app-state";
import {
	ContextPicker,
	GlassPanel,
	HomeCardTreatmentContext,
	homeCardTreatment,
	TabContent,
} from "../design-system";
import { canCoach } from "../domain/app-rules";
import { nextCoachingEvent } from "../domain/home";
import { ClubShell } from "./club-shell";
import { CoachDashboard } from "./coach-dashboard";
import { HomeSummary } from "./home-summary";
import { useClubNow } from "./use-club-now";

const homeWorkspaceAtom = atom<Record<string, "personal" | "coaching">>({});

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
	const workspace =
		canCoach(account) &&
		(params.view === "coaching" ||
			(params.view !== "personal" && workspaces[account.id] === "coaching"))
			? "coaching"
			: "personal";
	const now = useClubNow();
	const coaching = nextCoachingEvent(data, account, now);
	return (
		<ClubShell
			title="Summary"
			toolbarLeading={
				canCoach(account) ? (
					<GlassPanel padding="none" shape="pill" interactive>
						<ContextPicker
							label="Home workspace"
							presentation="menu"
							value={workspace}
							options={[
								{ value: "personal", label: "Player" },
								{ value: "coaching", label: "Coach" },
							]}
							onValueChange={(value): void => {
								setWorkspaces((current) => ({
									...current,
									[account.id]: value,
								}));
								router.setParams({ view: value });
							}}
						/>
					</GlassPanel>
				) : undefined
			}
		>
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
