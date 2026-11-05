import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Row,
	Stack,
	TabContent,
	Tabs,
	Text,
	useRouteSelection,
} from "../design-system";
import { ClubShell } from "./club-shell";
import { CoachingHoursReport } from "./coaching-hours-report";
import { ProgramCoachingRoster } from "./program-coaching-roster";
import { SeasonSelect } from "./season-select";
import {
	useLiveCoachingHours,
	usePreviewCoachingHours,
} from "./use-coaching-hours";
import { useSeason } from "./use-season";

const LiveReport = ({ seasonId }: { seasonId: string }): ReactElement => {
	const { practices, coaches, loading, correct } =
		useLiveCoachingHours(seasonId);
	return (
		<CoachingHoursReport
			correct={correct}
			practices={practices}
			coaches={coaches}
			loading={loading}
		/>
	);
};
const PreviewReport = ({ seasonId }: { seasonId: string }): ReactElement => {
	const { practices, coaches, loading, correct } =
		usePreviewCoachingHours(seasonId);
	return (
		<CoachingHoursReport
			correct={correct}
			practices={practices}
			coaches={coaches}
			loading={loading}
		/>
	);
};
export const CoachingHoursScreen = (): ReactElement => {
	const router = useRouter();
	const { account, source } = useApp();
	const [seasonId] = useSeason();
	const params = useLocalSearchParams<{ tab?: string }>();
	const selection = useRouteSelection(params.tab ?? "hours", (tab): void =>
		router.setParams({ tab }),
	);
	const tab =
		selection.value === "program-coaches" || selection.value === "assignments"
			? "program-coaches"
			: "hours";
	return (
		<ClubShell
			title="Hours"
			tabs={
				account.admin || account.coachPrograms.length ? (
					<Tabs
						page
						hideLabel
						label="Hours"
						value={tab}
						options={[
							{ value: "hours", label: "Hours" },
							{ value: "program-coaches", label: "Program coaches" },
						]}
						onValueChange={selection.select}
					/>
				) : undefined
			}
			back={
				<Row>
					<Button
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
		>
			{!account.coachPrograms.length && !account.admin ? (
				<Text>Coach access required.</Text>
			) : (
				<TabContent value={tab}>
					{tab === "program-coaches" ? (
						<ProgramCoachingRoster />
					) : (
						<Stack>
							<SeasonSelect />
							{source === "convex" ? (
								<LiveReport seasonId={seasonId} />
							) : (
								<PreviewReport seasonId={seasonId} />
							)}
						</Stack>
					)}
				</TabContent>
			)}
		</ClubShell>
	);
};
