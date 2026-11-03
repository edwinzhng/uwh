import { useRouter } from "expo-router";
import { Fragment, type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	CategoryCard,
	CategoryGrid,
	Divider,
	EmptyState,
	Field,
	featureIdentity,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { type ClubTool, clubToolGroups } from "../domain/club-navigation";
import { ClubShell } from "./club-shell";
import { clubToolLinks } from "./club-tool-links";

const categoryColors = {
	programs: featureIdentity.programs.category,
	members: featureIdentity.members.category,
	fitness: featureIdentity.fitness.category,
	videos: featureIdentity.videos.category,
} as const;

export const ClubHomeScreen = (): ReactElement => {
	const { account } = useApp();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const query = search.trim().toLowerCase();
	const matches = (key: ClubTool): boolean => {
		const tool = clubToolLinks[key];
		return `${tool.title} ${"description" in tool ? tool.description : ""} ${key}`
			.toLowerCase()
			.includes(query);
	};
	const groups = clubToolGroups(account).filter((group) =>
		group.tools.some(matches),
	);
	return (
		<ClubShell title="Club">
			<Field
				label="Search club tools"
				hideLabel
				placeholder="Search club tools"
				inputMode="search"
				value={search}
				onValueChange={setSearch}
			/>
			{groups.map((group) => {
				if (group.kind === "categories")
					return (
						<Stack key={group.title} gap="xs">
							<SectionHeading>{group.title}</SectionHeading>
							<CategoryGrid>
								{group.tools.filter(matches).map((key) => {
									const tool = clubToolLinks[key];
									return (
										<CategoryCard
											key={key}
											title={tool.title}
											description={tool.description}
											icon={tool.icon}
											category={categoryColors[key]}
											density="compact"
											onPress={(): void => router.push(tool.href)}
										/>
									);
								})}
							</CategoryGrid>
						</Stack>
					);
				const tools = group.tools.filter(matches);
				const rows = (
					<Surface key={`rows:${group.title}`} padding="xs">
						<List>
							{tools.map((key, index) => {
								const tool = clubToolLinks[key];
								return (
									<Fragment key={key}>
										<ListItem
											title={tool.title}
											icon={tool.icon}
											onPress={(): void => router.push(tool.href)}
										/>
										{index < tools.length - 1 ? <Divider /> : undefined}
									</Fragment>
								);
							})}
						</List>
					</Surface>
				);
				return (
					<Stack key={group.title} gap="xs">
						<SectionHeading>
							{group.title === "Manage club" ? "Administration" : group.title}
						</SectionHeading>
						{rows}
					</Stack>
				);
			})}
			{groups.length === 0 ? (
				<EmptyState
					title="No tools found"
					description="Try a program, document, coaching or account tool."
				/>
			) : undefined}
		</ClubShell>
	);
};
