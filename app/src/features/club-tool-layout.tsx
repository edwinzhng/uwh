import type { ReactElement } from "react";
import {
	CategoryGrid,
	CategoryGridItem,
	ClubCardOption,
	List,
	ListItem,
	RoleScope,
	Surface,
	Text,
} from "../design-system";
import type { ClubTool } from "../domain/club-navigation";
import { clubToolLinks } from "./club-tool-links";
export type ClubLayoutTreatment =
	| "compact"
	| "directory"
	| "scoreboard"
	| "color";
const toolRole = (tool: ClubTool): "coach" | "admin" | undefined =>
	["coaching", "reviews", "hours", "attendance"].includes(tool)
		? "coach"
		: [
					"registration",
					"payments",
					"equipment",
					"settings",
					"moderation",
					"imports",
				].includes(tool)
			? "admin"
			: undefined;
export const ClubToolLayout = ({
	tools,
	grouped = false,
	treatment,
	registered,
	active,
	navigate,
}: {
	tools: ClubTool[];
	grouped?: boolean;
	treatment: ClubLayoutTreatment;
	registered?: number;
	active?: number;
	navigate: (tool: ClubTool) => void;
}): ReactElement => {
	const stat = (
		tool: ClubTool,
	): { value: number; label: string } | undefined =>
		tool === "members" && registered !== undefined
			? { value: registered, label: "registered" }
			: tool === "programs" && active !== undefined
				? { value: active, label: "active" }
				: undefined;
	const metrics = tools.filter(
		(tool) => tool === "members" || tool === "programs",
	);
	const links = tools.filter(
		(tool) => tool !== "members" && tool !== "programs",
	);
	const ordered =
		treatment === "scoreboard" || treatment === "color"
			? [...metrics, ...links]
			: tools;
	return treatment === "directory" ? (
		<Surface padding="xxs">
			<List>
				{ordered.map((tool) => (
					<RoleScope key={tool} tone={grouped ? undefined : toolRole(tool)}>
						<ListItem
							title={clubToolLinks[tool].title}
							icon={clubToolLinks[tool].icon}
							density="compact"
							trailing={
								stat(tool) ? (
									<Text variant="h4">{stat(tool)?.value}</Text>
								) : undefined
							}
							onPress={(): void => navigate(tool)}
						/>
					</RoleScope>
				))}
			</List>
		</Surface>
	) : (
		<CategoryGrid minimumCardWidth={160}>
			{ordered.map((tool) => (
				<CategoryGridItem
					key={tool}
					fullWidth={treatment === "compact" && Boolean(stat(tool))}
				>
					<RoleScope tone={grouped ? undefined : toolRole(tool)}>
						<ClubCardOption
							title={clubToolLinks[tool].title}
							icon={clubToolLinks[tool].icon}
							category={
								tool === "members"
									? "orange"
									: tool === "programs"
										? "indigo"
										: tool === "fitness"
											? "fern"
											: tool === "videos"
												? "violet"
												: tool === "announcements"
													? "coral"
													: tool === "equipment"
														? "amber"
														: "sky"
							}
							stat={stat(tool)}
							treatment={
								treatment === "color"
									? stat(tool)
										? "color-field"
										: "hybrid"
									: treatment === "scoreboard" && stat(tool)
										? "corner"
										: "hybrid"
							}
							onPress={(): void => navigate(tool)}
						/>
					</RoleScope>
				</CategoryGridItem>
			))}
		</CategoryGrid>
	);
};
