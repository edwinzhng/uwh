import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	CategoryCard,
	CategoryGrid,
	CategoryGridItem,
	SectionHeading,
	Stack,
} from "../design-system";
import { clubToolGroups } from "../domain/club-navigation";
import { defaultSeasonId } from "../domain/seasons";
import { ClubShell } from "./club-shell";
import { ClubSummaryData } from "./club-summary-data";
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
		<ClubShell title="Club">
			<ClubSummaryData seasonId={seasonId}>
				{(registered) => (
					<>
						{clubToolGroups(account).map((group) => (
							<Stack key={group.title} gap="xs">
								<SectionHeading>{group.title}</SectionHeading>
								<CategoryGrid minimumCardWidth={168}>
									{[...group.tools]
										.sort((a, b) =>
											clubToolLinks[a].title.localeCompare(
												clubToolLinks[b].title,
											),
										)
										.map((key) => {
											const tool = clubToolLinks[key];
											return (
												<CategoryGridItem
													key={key}
													fullWidth={key === "members" || key === "programs"}
												>
													<CategoryCard
														title={tool.title}
														icon={tool.icon}
														density="row"
														stat={
															key === "programs" && activePrograms !== undefined
																? { value: activePrograms, label: "active" }
																: key === "members" && registered !== undefined
																	? { value: registered, label: "registered" }
																	: undefined
														}
														onPress={(): void => router.push(tool.href)}
													/>
												</CategoryGridItem>
											);
										})}
								</CategoryGrid>
							</Stack>
						))}
					</>
				)}
			</ClubSummaryData>
		</ClubShell>
	);
};
