import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { RoleLabel, SectionHeading, Stack } from "../design-system";
import { clubToolGroups } from "../domain/club-navigation";
import { defaultSeasonId } from "../domain/seasons";
import { ClubShell } from "./club-shell";
import { ClubSummaryData } from "./club-summary-data";
import { ClubToolLayout } from "./club-tool-layout";
import { clubToolLinks } from "./club-tool-links";
import { useClubToday } from "./use-club-today";

export const ClubHomeScreen = (): ReactElement => {
	const { account, data } = useApp();
	const router = useRouter();
	const today = useClubToday();
	const seasonId =
		data.seasons.find((season) => season.start <= today && season.end >= today)
			?.id ?? defaultSeasonId;
	const activePrograms = data.programs?.filter(
		(program) => !program.archived && program.status === "active",
	).length;
	return (
		<ClubShell>
			<ClubSummaryData seasonId={seasonId}>
				{(registered) => (
					<>
						{clubToolGroups(account).map((group) => (
							<Stack key={group.title} gap="xs">
								{group.title !== "Club" ? (
									<SectionHeading
										badge={
											<RoleLabel
												roleKind={
													group.title === "Coaching" ? "coach" : "admin"
												}
											/>
										}
									>
										{group.title}
									</SectionHeading>
								) : undefined}
								<ClubToolLayout
									treatment="color"
									grouped={group.title !== "Club"}
									tools={[...group.tools].sort((a, b) =>
										a === "equipment"
											? -1
											: b === "equipment"
												? 1
												: clubToolLinks[a].title.localeCompare(
														clubToolLinks[b].title,
													),
									)}
									registered={registered}
									active={activePrograms}
									navigate={(key) => router.push(clubToolLinks[key].href)}
								/>
							</Stack>
						))}
					</>
				)}
			</ClubSummaryData>
		</ClubShell>
	);
};
