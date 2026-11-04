import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Team = {
	label: string;
	formation: string;
	rows: { id: string; name: string }[][];
};
export const LineupPreview = ({ teams }: { teams: Team[] }): ReactElement => {
	const theme = useTheme();
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
			{teams.map((team) => (
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
												width: space.sm,
												height: space.sm,
												borderRadius: corners.panel,
												backgroundColor: theme.text.secondary,
												marginBottom: space.xxs,
											}}
										/>
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
	);
};
