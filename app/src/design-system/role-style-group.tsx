import type { Href } from "expo-router";
import type { ReactElement } from "react";
import { View } from "react-native";
import { Button } from "./button";
import { Icon } from "./icon";
import { ListItem } from "./list-item";
import { rainbowPalette } from "./rainbow-palette";
import { RoleStyleLabel } from "./role-style-label";
import {
	type PreviewRole,
	type RoleStyle,
	roleDestinations,
} from "./role-style-preview-types";
import { Row } from "./row";
import { Surface } from "./surface";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";
export const RoleStyleGroup = ({
	roleKind,
	treatment,
	onOpen,
}: {
	roleKind: PreviewRole;
	treatment: RoleStyle;
	onOpen: (href: Href) => void;
}): ReactElement => {
	const theme = useTheme();
	const sample = roleDestinations[roleKind];
	const palette = rainbowPalette[roleKind === "coach" ? "violet" : "blue"];
	const iconColor =
		treatment === "badge"
			? theme.mode === "dark"
				? palette.light
				: palette.accent
			: undefined;
	return (
		<View
			style={{
				gap: space.sm,
				borderLeftWidth: treatment === "rail" ? geometry.border * 3 : 0,
				borderLeftColor: palette.accent,
				paddingLeft: treatment === "rail" ? space.sm : 0,
			}}
		>
			<Row gap="xs" justify="between" wrap>
				<Text variant="label">{sample.heading}</Text>
				{treatment !== "badge" ? (
					<RoleStyleLabel roleKind={roleKind} />
				) : undefined}
			</Row>

			<Surface
				density="compact"
				roleTone={treatment === "glow" ? roleKind : undefined}
			>
				<ListItem
					title={sample.card.label}
					icon={treatment === "badge" ? undefined : sample.card.icon}
					leading={
						treatment === "badge" ? (
							<Icon name={sample.card.icon} color={iconColor} />
						) : undefined
					}
					titleAccessory={
						treatment === "badge" ? (
							<RoleStyleLabel roleKind={roleKind} />
						) : undefined
					}
					accessibilityLabel={`${sample.label} · ${sample.card.label}`}
					onPress={(): void => onOpen(sample.card.href)}
				/>
			</Surface>
			<Row gap="xs" wrap>
				<Button
					label={sample.action.label}
					roleTone={treatment === "glow" ? roleKind : undefined}
					accessibilityLabel={`${sample.label} · ${sample.action.label}`}
					variant="secondary"
					leading={
						<Icon
							name={sample.action.icon}
							size="sm"
							color={iconColor}
							tone="secondary"
						/>
					}
					onPress={(): void => onOpen(sample.action.href)}
				/>
				{treatment === "badge" ? (
					<RoleStyleLabel roleKind={roleKind} />
				) : undefined}
			</Row>
		</View>
	);
};
