import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	ClubCardPreviewFrame,
	EmptyState,
	Grid,
	Row,
	Stack,
	Surface,
	Text,
	ThemeToggle,
	themePreferenceAtom,
	WatercolorControls,
	type WatercolorTuning,
	WatercolorTuningContext,
	watercolorDefaults,
	watercolorParameter,
} from "../design-system";
import { defaultSeasonId } from "../domain/seasons";
import { ClubShell } from "./club-shell";
import { ClubSummaryData } from "./club-summary-data";
import { ClubToolLayout } from "./club-tool-layout";
import { clubToolLinks } from "./club-tool-links";
import { useClubToday } from "./use-club-today";

export const WatercolorTuningScreen = (): ReactElement => {
	const params = useLocalSearchParams<{
		grain?: string;
		speed?: string;
		smoothness?: string;
		intensity?: string;
	}>();
	const router = useRouter();
	const { data } = useApp();
	const today = useClubToday();
	const seasonId =
		data.seasons.find((season) => season.start <= today && season.end >= today)
			?.id ?? defaultSeasonId;
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	const [paused, setPaused] = useState(false);
	const [tuning, setTuning] = useState<WatercolorTuning>(() => ({
		grain: watercolorParameter(params.grain, watercolorDefaults.grain),
		speed: watercolorParameter(params.speed, watercolorDefaults.speed, 2),
		smoothness: watercolorParameter(
			params.smoothness,
			watercolorDefaults.smoothness,
		),
		intensity: watercolorParameter(
			params.intensity,
			watercolorDefaults.intensity,
		),
	}));
	const commit = (next: WatercolorTuning): void => {
		setTuning(next);
		router.setParams({
			grain: next.grain.toFixed(2),
			speed: next.speed.toFixed(2),
			smoothness: next.smoothness.toFixed(2),
			intensity: next.intensity.toFixed(2),
		});
	};
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<ClubShell
			title="Watercolor"
			back={
				<Button
					label="Club"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			}
		>
			<ThemeToggle value={theme} onValueChange={setTheme} />
			<ClubSummaryData seasonId={seasonId}>
				{(registered) => (
					<Grid gap="lg">
						<Surface>
							<Stack gap="sm">
								<WatercolorControls
									value={tuning}
									onChange={setTuning}
									onCommit={commit}
								/>
								<Row wrap gap="xs">
									<Button
										label={paused ? "Play" : "Pause"}
										variant="secondary"
										onPress={(): void => setPaused((previous) => !previous)}
									/>
									<Button
										label="Reset"
										variant="ghost"
										onPress={(): void => commit(watercolorDefaults)}
									/>
								</Row>
								<Text variant="caption" tone="secondary">
									Settings are saved in the URL. Grain adds texture; smoothness
									softens the flowing color shapes.
								</Text>
							</Stack>
						</Surface>
						<WatercolorTuningContext
							value={paused ? { ...tuning, speed: 0 } : tuning}
						>
							<ClubCardPreviewFrame size="phone">
								<ClubToolLayout
									treatment="color"
									tools={[
										"members",
										"programs",
										"announcements",
										"equipment",
										"documents",
										"fitness",
										"videos",
									]}
									registered={registered}
									active={
										data.programs?.filter((program) => !program.archived).length
									}
									navigate={(tool) => router.push(clubToolLinks[tool].href)}
								/>
							</ClubCardPreviewFrame>
						</WatercolorTuningContext>
					</Grid>
				)}
			</ClubSummaryData>
		</ClubShell>
	);
};
