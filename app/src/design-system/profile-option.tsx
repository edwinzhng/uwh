import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { interactiveRow } from "./interactive-row-layout";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

type Props = {
	name: string;
	personId?: string;
	description?: string;
	isSelected: boolean;
	onPress: () => void;
};
export const ProfileOption = ({
	name,
	personId,
	isSelected,
	onPress,
}: Props): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`View ${name}'s profile`}
			accessibilityState={{ selected: isSelected }}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				minHeight: interactiveRow.minHeight,
				justifyContent: "center",
				paddingHorizontal: interactiveRow.paddingHorizontal,
				paddingVertical: interactiveRow.paddingVertical,
				marginHorizontal: 0,
				borderRadius: interactiveRow.borderRadius,
				borderWidth: geometry.border,
				borderColor: isSelected ? theme.controlBorder : theme.border,
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: interactiveRow.focusOffset,
				outlineColor: theme.focus,
				backgroundColor: isSelected
					? theme.background.secondary
					: hovered || pressed
						? theme.background.hover
						: theme.background.primary,
				opacity: pressed ? geometry.pressedOpacity : 1,
			})}
		>
			<Row gap="sm">
				<Avatar name={name} personId={personId} compact />
				<Stack gap="none" grow>
					<Text variant="small" weight="medium">
						{name}
					</Text>
				</Stack>
				{isSelected ? <Icon name="check" /> : undefined}
			</Row>
		</Pressable>
	);
};
