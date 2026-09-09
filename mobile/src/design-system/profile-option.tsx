import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Props = {
	name: string;
	description: string;
	isSelected: boolean;
	onPress: () => void;
};
export const ProfileOption = ({
	name,
	description,
	isSelected,
	onPress,
}: Props): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`View ${name}'s profile`}
			accessibilityState={{ selected: isSelected }}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				minHeight: geometry.touch,
				paddingHorizontal: space.sm,
				paddingVertical: space.xs,
				borderRadius: corners.control,
				borderWidth: geometry.border,
				borderColor: isSelected ? theme.controlBorder : theme.border,
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: geometry.focus,
				outlineColor: theme.focus,
				backgroundColor: isSelected
					? theme.background.secondary
					: theme.background.primary,
				opacity: pressed ? geometry.pressedOpacity : 1,
			})}
		>
			<Row gap="sm">
				<Avatar name={name} />
				<Stack gap="none">
					<Text variant="label">{name}</Text>
					<Text variant="caption" tone="secondary">
						{description}
					</Text>
				</Stack>
				{isSelected ? <Icon name="check" /> : undefined}
			</Row>
		</Pressable>
	);
};
