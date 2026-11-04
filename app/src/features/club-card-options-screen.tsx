import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	CategoryGrid,
	CategoryGridItem,
	ClubCardOption,
	ClubCardPreviewFrame,
	type ClubCardTreatment,
	EmptyState,
	Grid,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { type ClubTool, clubToolGroups } from "../domain/club-navigation";
import { defaultSeasonId } from "../domain/seasons";
import { ClubShell } from "./club-shell";
import { ClubSummaryData } from "./club-summary-data";
import { clubToolLinks } from "./club-tool-links";
import { useClubToday } from "./use-club-today";

const treatments = [
	{ value: "watercolor-soft", label: "A · Quiet watercolor" },
	{ value: "watercolor-bold", label: "B · Rich watercolor" },
	{ value: "corner", label: "C · Color accent" },
	{ value: "compact", label: "D · Compact rows" },
	{ value: "hybrid", label: "E · Hybrid rows" },
	{ value: "hybrid-watercolor", label: "F · Hybrid watercolor" },
] satisfies { value: ClubCardTreatment; label: string }[];
const colors = {
	announcements: "coral",
	equipment: "amber",
	documents: "sky",
	fitness: "fern",
	members: "orange",
	programs: "indigo",
	videos: "violet",
} as const;
type SampleTool = keyof typeof colors;
const sampleTool = (tool: ClubTool): tool is SampleTool => tool in colors;

export const ClubCardOptionsScreen = (): ReactElement => {
	const { account, data } = useApp();
	const router = useRouter();
	const today = useClubToday();
	const [viewport, setViewport] = useState<"phone" | "desktop">("phone");
	const seasonId =
		data.seasons.find((season) => season.start <= today && season.end >= today)
			?.id ?? defaultSeasonId;
	const tools = (clubToolGroups(account).at(0)?.tools ?? [])
		.filter(sampleTool)
		.sort((a, b) =>
			clubToolLinks[a].title.localeCompare(clubToolLinks[b].title),
		)
		.slice(0, 6);
	const active = data.programs?.filter(
		(program) => !program.archived && program.status === "active",
	).length;
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<ClubShell
			title="Club card options"
			back={
				<Button
					label="Club"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			}
		>
			<Stack gap="sm">
				<SegmentedControl
					label="Preview size"
					value={viewport}
					onValueChange={setViewport}
					options={[
						{ value: "phone", label: "Phone" },
						{ value: "desktop", label: "Desktop" },
					]}
				/>
			</Stack>
			<ClubSummaryData seasonId={seasonId}>
				{(registered) => (
					<Stack gap="xl">
						{[
							treatments.slice(0, 2),
							treatments.slice(2, 4),
							treatments.slice(4),
						].map((group) => (
							<Grid key={group.at(0)?.value} gap="xl">
								{group.map((treatment) => (
									<Stack key={treatment.value} gap="sm">
										<Text variant="h4">{treatment.label}</Text>
										<ClubCardPreviewFrame size={viewport}>
											<CategoryGrid
												minimumCardWidth={
													treatment.value === "compact" ? 280 : 168
												}
											>
												{tools.map((key) => (
													<CategoryGridItem
														key={key}
														fullWidth={
															(treatment.value === "hybrid" ||
																treatment.value === "hybrid-watercolor") &&
															(key === "members" || key === "programs")
														}
													>
														<ClubCardOption
															treatment={treatment.value}
															title={clubToolLinks[key].title}
															icon={clubToolLinks[key].icon}
															category={colors[key]}
															stat={
																key === "members" && registered !== undefined
																	? { value: registered, label: "registered" }
																	: key === "programs" && active !== undefined
																		? { value: active, label: "active" }
																		: undefined
															}
															onPress={(): void =>
																router.push(clubToolLinks[key].href)
															}
														/>
													</CategoryGridItem>
												))}
											</CategoryGrid>
										</ClubCardPreviewFrame>
									</Stack>
								))}
							</Grid>
						))}
					</Stack>
				)}
			</ClubSummaryData>
		</ClubShell>
	);
};
