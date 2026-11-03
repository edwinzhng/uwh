import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardBackground } from "./card-background";
import { Icon, type IconName } from "./icon";
import { InteractionHighlight } from "./interaction-highlight";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const NavigationCard = ({
	title,
	description,
	icon,
	label,
	trailing,
	accessory,
	onPress,
}: {
	title: string;
	description: string;
	icon: IconName;
	label: string;
	trailing?: ReactNode;
	accessory?: ReactNode;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<View
			onPointerEnter={(event): void =>
				setHovered(event.nativeEvent.pointerType === "mouse")
			}
			onPointerLeave={(): void => setHovered(false)}
			style={{
				position: "relative",
				borderWidth: geometry.border,
				borderColor: theme.border,
				borderRadius: corners.panel,
			}}
		>
			<CardBackground color={theme.background.card} />
			<CardAtmosphere />
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				onPress={onPress}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={{
					minHeight: geometry.touch,
					padding: space.md,
					borderRadius: corners.panel,
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
					outlineOffset: -geometry.focus,
				}}
			>
				{({ pressed }): ReactElement => (
					<>
						<InteractionHighlight
							active={hovered || pressed}
							color={theme.text.primary}
							radius={corners.panel}
							subtle
						/>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: space.sm,
							}}
						>
							<Icon name={icon} size="sm" tone="secondary" />
							<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
								<Text variant="small" weight="semibold">
									{title}
								</Text>
								<Text variant="caption" tone="secondary" lines={1}>
									{description}
								</Text>
							</View>
							{trailing}
							{accessory ? (
								<View style={{ width: geometry.touch }} />
							) : undefined}
							<Icon name="chevron" size="sm" tone="secondary" />
						</View>
					</>
				)}
			</Pressable>
			{accessory ? (
				<View
					style={{
						position: "absolute",
						right: space.md + geometry.iconSmall + space.sm,
						top: 0,
						bottom: 0,
						justifyContent: "center",
					}}
				>
					{accessory}
				</View>
			) : undefined}
		</View>
	);
};
