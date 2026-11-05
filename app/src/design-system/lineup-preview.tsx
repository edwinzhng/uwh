import type { ReactElement } from "react";
import { Text as NativeText, View } from "react-native";
import { LineupBackdrop } from "./lineup-backdrop";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, palette, space, typography } from "./tokens";

type Team = {
	label: string;
	formation: string;
	side: "black" | "white";
	rows: { id: string; name: string; role?: string; positionLabel: string }[][];
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
								<View style={{ gap: 0 }}>
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
												paddingVertical: space.xs + space.xxs / 2,
												alignItems: "center",
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
														opacity: person.name === "—" ? 0.55 : 1,
													}}
												>
													<View
														style={{
															minWidth: geometry.icon + space.xs,
															minHeight: geometry.icon + space.xs,
															paddingHorizontal: space.xxs,
															paddingVertical: space.xxs,
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
															marginBottom: space.xs,
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
													{person.role ? (
														<Text variant="small" tone="secondary" lines={1}>
															({person.role})
														</Text>
													) : undefined}
												</View>
											))}
										</View>
									))}
								</View>
							</View>
						))}
					</View>
				</Stack>
			))}
		</Stack>
	);
};
