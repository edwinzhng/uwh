import type { ReactElement } from "react";
import { View } from "react-native";
import { ActionMenu } from "./action-menu";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
export const LineupRoleMenu = ({
	label,
	roleLabel,
	people,
	personId,
	displayName,
	onChange,
}: {
	label: string;
	roleLabel: "Capt." | "Ref.";
	people: readonly { id: string; name: string }[];
	personId?: string;
	displayName?: string;
	onChange?: (id?: string) => void;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				minWidth: 0,
				maxWidth: "49%",
				borderRadius: corners.control,
				borderWidth: geometry.border,
				borderColor: personId ? theme.controlBorder : "transparent",
				backgroundColor: personId ? theme.background.selected : "transparent",
			}}
		>
			<ActionMenu
				compact
				label={`${roleLabel}${personId && displayName ? ` ${displayName}` : ""}`}
				accessibilityLabel={label}
				isDisabled={!onChange}
				groups={[
					{
						id: "people",
						items: [
							{
								id: "none",
								label: "Not assigned",
								onSelect: (): void => onChange?.(),
							},
							...people.map((person) => ({
								id: person.id,
								label: `${person.name}${person.id === personId ? " ✓" : ""}`,
								onSelect: (): void => onChange?.(person.id),
							})),
						],
					},
				]}
			/>
		</View>
	);
};
