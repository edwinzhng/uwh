import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Row, Stack, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { CoachingHoursReport } from "./coaching-hours-report";
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
	return (
		<ClubShell
			title="Coaching hours"
			staffRole={account.coachPrograms.length ? "coach" : undefined}
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
			{!account.coachPrograms.length ? (
				<Text>Coach access required.</Text>
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
		</ClubShell>
	);
};
