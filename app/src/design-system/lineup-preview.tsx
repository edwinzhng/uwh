import type { ReactElement } from "react";
import { Text as NativeText, View } from "react-native";
import { Avatar } from "./avatar";
import { LineupBackdrop } from "./lineup-backdrop";
import { LineupRolePortrait } from "./lineup-role-portrait";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

type Person = { personId: string; name: string };
type Team = {
	label: string;
	formation: string;
	side: "black" | "white";
	rows: {
		id: string;
		name: string;
		personId?: string;
		positionLabel: string;
		substitutes: Person[];
	}[][];
	roles: {
		personId: string;
		name: string;
		role: "Captain" | "Vice Captain" | "Ref" | "2nd Ref";
	}[];
};
export const LineupPreview = ({
	groups,
}: {
	groups: { label?: string; teams: Team[] }[];
}): ReactElement => {
	const theme = useTheme();
	return (
		<Stack>
			{groups.map((group, index) => (
				<Stack key={group.label ?? String(index)} gap="sm">
					{group.label ? <Text variant="h4">{group.label}</Text> : undefined}
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
					>
						{group.teams.map((team) => (
							<View
								key={team.label}
								style={{
									flex: 1,
									flexBasis: "45%",
									minWidth: 0,
									borderWidth: geometry.border,
									borderColor: theme.border,
									borderRadius: corners.panel,
									backgroundColor: theme.background.card,
									overflow: "hidden",
									padding: space.xs,
								}}
							>
								<LineupBackdrop />
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "space-between",
										paddingBottom: space.sm,
										gap: space.xxs,
									}}
								>
									<NativeText
										numberOfLines={1}
										style={{
											...typography.caption,
											fontFamily: font.medium,
											color: team.side === "black" ? "#EEF2D9" : "#101710",
											backgroundColor:
												team.side === "black" ? "#101710" : "#EEF2D9",
											paddingHorizontal: space.xs,
											borderRadius: corners.control,
											overflow: "hidden",
										}}
									>
										{team.label}
									</NativeText>
									<Text variant="caption" lines={1}>
										{team.formation}
									</Text>
								</View>
								{team.rows.map((row) => (
									<View
										key={row.map((person) => person.id).join(":")}
										style={{
											flexDirection: "row",
											justifyContent: "space-around",
											gap: space.xxs,
											minHeight: geometry.touch,
											paddingVertical: space.xs,
											alignItems: "flex-start",
											borderTopWidth: geometry.border,
											borderColor: theme.border,
										}}
									>
										{row.map((person) => (
											<View
												key={person.id}
												style={{
													flex: 1,
													minWidth: 0,
													alignItems: "center",
													gap: space.xxs,
												}}
											>
												<Text variant="caption">{person.positionLabel}</Text>
												{person.personId ? (
													<>
														<Avatar
															name={person.name}
															personId={person.personId}
															initials
															compact
														/>
														<Text variant="caption" lines={1}>
															{person.name.split(" ").at(0)}
														</Text>
													</>
												) : (
													<Text variant="caption" tone="secondary">
														—
													</Text>
												)}
												{person.substitutes.map((sub) => (
													<View
														key={sub.personId}
														style={{ alignItems: "center" }}
													>
														<Text variant="caption">Sub</Text>
														<Avatar
															name={sub.name}
															personId={sub.personId}
															initials
															compact
														/>
														<Text variant="caption" lines={1}>
															{sub.name.split(" ").at(0)}
														</Text>
													</View>
												))}
											</View>
										))}
									</View>
								))}
								{team.roles.length ? (
									<View
										style={{
											flexDirection: "row",
											flexWrap: "wrap",
											justifyContent: "space-between",
											gap: space.xs,
											borderTopWidth: geometry.border,
											borderColor: theme.border,
											paddingTop: space.xs,
										}}
									>
										{team.roles.map((role) => (
											<LineupRolePortrait
												key={`${role.role}:${role.personId}`}
												roleLabel={role.role}
												personId={role.personId}
												name={role.name}
												displayName={role.name.split(" ").at(0)}
											/>
										))}
									</View>
								) : undefined}
							</View>
						))}
					</View>
				</Stack>
			))}
		</Stack>
	);
};
