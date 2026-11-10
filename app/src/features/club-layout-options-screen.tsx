import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	ClubCardPreviewFrame,
	EmptyState,
	Grid,
	RoleLabel,
	SectionHeading,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { clubToolGroups } from "../domain/club-navigation";
import { defaultSeasonId } from "../domain/seasons";
import { ClubShell } from "./club-shell";
import { ClubSummaryData } from "./club-summary-data";
import { type ClubLayoutTreatment, ClubToolLayout } from "./club-tool-layout";
import { clubToolLinks } from "./club-tool-links";
import { useClubToday } from "./use-club-today";

const options = [
	{ value: "compact", label: "A · Compact pairs" },
	{ value: "directory", label: "B · Club directory" },
	{ value: "scoreboard", label: "C · Stats first" },
	{ value: "color", label: "D · Color field" },
] satisfies { value: ClubLayoutTreatment; label: string }[];
export const ClubLayoutOptionsScreen = (): ReactElement => {
	const { account, data } = useApp();
	const router = useRouter();
	const today = useClubToday();
	const [viewport, setViewport] = useState<"phone" | "desktop">("phone");
	const groups = clubToolGroups(account);
	const seasonId =
		data.seasons.find((season) => season.start <= today && season.end >= today)
			?.id ?? defaultSeasonId;
	const active = data.programs?.filter(
		(program) => !program.archived && program.status === "active",
	).length;
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<ClubShell title="Club layouts">
			<SegmentedControl
				label="Viewport"
				value={viewport}
				onValueChange={setViewport}
				options={[
					{ value: "phone", label: "Phone" },
					{ value: "desktop", label: "Desktop" },
				]}
			/>
			<ClubSummaryData seasonId={seasonId}>
				{(registered) => (
					<Stack gap="section">
						{[options.slice(0, 2), options.slice(2)].map((groupOptions) => (
							<Grid key={groupOptions.at(0)?.value} gap="section">
								{groupOptions.map((option) => (
									<Stack key={option.value} gap="sm">
										<Text variant="h4">{option.label}</Text>
										<ClubCardPreviewFrame size={viewport}>
											<Stack gap="lg">
												{groups.map((group, index) => (
													<Stack key={group.title} gap="xs">
														{index > 0 ? (
															<SectionHeading
																action={
																	<RoleLabel
																		roleKind={
																			group.title === "Coaching"
																				? "coach"
																				: "admin"
																		}
																	/>
																}
															>
																{group.title}
															</SectionHeading>
														) : undefined}
														<ClubToolLayout
															treatment={option.value}
															tools={[...group.tools].sort((a, b) =>
																clubToolLinks[a].title.localeCompare(
																	clubToolLinks[b].title,
																),
															)}
															registered={registered}
															active={active}
															navigate={(tool) =>
																router.push(clubToolLinks[tool].href)
															}
														/>
													</Stack>
												))}
											</Stack>
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
