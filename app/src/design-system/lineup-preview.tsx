import type { ReactElement } from "react";
import { Text as NativeText, View } from "react-native";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, palette, space, typography } from "./tokens";

type Team = {
	label: string;
	formation: string;
	side: "black" | "white";
	rows: { id: string; name: string; positionLabel: string }[][];
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
									padding: space.xs,
								}}
							>
								<Stack gap="xs">
									<Text variant="caption" weight="medium">
										{team.label} · {team.formation}
									</Text>
									{team.rows.map((row) => (
										<View
											key={row.map((person) => person.id).join(":")}
											style={{
												flexDirection: "row",
												justifyContent: "space-around",
												gap: space.xxs,
												minHeight: geometry.touch,
												paddingVertical: space.xs,
												alignItems: "center",
												borderTopWidth: geometry.border,
												borderColor: theme.border,
											}}
										>
											{row.map((person) => (
												<View
													key={person.id}
													style={{ flex: 1, minWidth: 0, alignItems: "center" }}
												>
													<View
														style={{
															width: geometry.icon,
															height: geometry.icon,
															borderRadius: corners.panel,
															backgroundColor:
																team.side === "black"
																	? palette.black
																	: palette.white,
															borderWidth: geometry.border,
															borderColor:
																team.side === "black"
																	? theme.text.secondary
																	: palette.black,
															alignItems: "center",
															justifyContent: "center",
															marginBottom: space.xxs,
														}}
													>
														<NativeText
															style={{
																...typography.navigation,
																fontFamily: font.medium,
																color:
																	team.side === "black"
																		? palette.white
																		: palette.black,
															}}
														>
															{person.positionLabel}
														</NativeText>
													</View>
													<Text variant="caption" lines={1}>
														{person.name}
													</Text>
												</View>
											))}
										</View>
									))}
								</Stack>
							</View>
						))}
					</View>
				</Stack>
			))}
		</Stack>
	);
};
