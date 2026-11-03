import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Row, Stack, TabContent, Tabs, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { CoachingHoursReport } from "./coaching-hours-report";
import { CoachingPractices } from "./coaching-practices";
import { ProgramCoachingRoster } from "./program-coaching-roster";
import { SeasonSelect } from "./season-select";
import {
	useLiveCoachingHours,
	usePreviewCoachingHours,
} from "./use-coaching-hours";
import { useSeason } from "./use-season";

const LiveReport = ({ seasonId }: { seasonId: string }): ReactElement => {
	const { practices, loading } = useLiveCoachingHours(seasonId);
	return <CoachingHoursReport practices={practices} loading={loading} />;
};
const PreviewReport = ({ seasonId }: { seasonId: string }): ReactElement => {
	const { practices, loading } = usePreviewCoachingHours(seasonId);
	return <CoachingHoursReport practices={practices} loading={loading} />;
};
export const CoachingHoursScreen = (): ReactElement => {
	const router = useRouter();
	const { account, source } = useApp();
	const [seasonId] = useSeason();
	const params = useLocalSearchParams<{ tab?: string }>();
	const tab = params.tab === "hours" ? "hours" : "assignments";
	return (
		<ClubShell
			title="Coaching"
			tabs={
				account.admin || account.coachPrograms.length ? (
					<Tabs
						page
						hideLabel
						label="Coaching"
						value={tab}
						options={[
							{ value: "assignments", label: "Assignments" },
							{ value: "hours", label: "Hours" },
						]}
						onValueChange={(value): void => router.setParams({ tab: value })}
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
					{tab === "assignments" ? (
						<Stack gap="xl">
							<CoachingPractices />
							<ProgramCoachingRoster />
						</Stack>
					) : (
						<Stack>
							<SeasonSelect />
							{source === "convex" ? (
								<LiveReport key={seasonId} seasonId={seasonId} />
							) : (
								<PreviewReport key={seasonId} seasonId={seasonId} />
							)}
						</Stack>
					)}
				</TabContent>
			)}
		</ClubShell>
	);
};
