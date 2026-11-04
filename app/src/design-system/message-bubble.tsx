import { type ReactElement, type ReactNode, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Avatar } from "./avatar";
import { chatColors } from "./chat-colors";
import {
	messageBubbleLayout,
	showMessageReaction,
} from "./message-bubble-layout";
import { MessageMenuPosition } from "./message-menu-position";
import { Text } from "./text";
import { useTheme } from "./theme";
import { ThemeScope } from "./theme-scope";
import { corners, geometry, space } from "./tokens";

export const MessageBubble = ({
	children,
	outgoing = false,
	timeLabel,
	authorLabel,
	authorId,
	avatarLabel,
	stamp,
	reactions,
	reactionOpen = false,
	actions,
	actionsFocused = false,
	reaction,
	contextSurface,
}: {
	children: ReactNode;
	outgoing?: boolean;
	timeLabel?: string;
	authorLabel?: string;
	authorId?: string;
	avatarLabel?: string;
	stamp?: string;
	reactions?: ReactNode;
	reactionOpen?: boolean;
	actions?: ReactNode;
	actionsFocused?: boolean;
	reaction?: ReactNode;
	contextSurface?: (content: ReactNode) => ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const viewport = useWindowDimensions();
	const [availableWidth, setAvailableWidth] = useState(0);
	const layout = messageBubbleLayout(
		(availableWidth || Math.max(0, viewport.width - space.sm * 2)) -
			(avatarLabel && !outgoing ? geometry.compactAvatar + space.xs : 0),
		Boolean(reaction),
	);
	const bubble = (
		<ThemeScope
			appearance={
				outgoing ? (theme.mode === "dark" ? "light" : "dark") : theme.mode
			}
		>
			<View
				style={{
					maxWidth: layout.maxWidth,
					minWidth: 0,
					flexShrink: 1,
					minHeight: geometry.touch,
					borderRadius: corners.panel,
					backgroundColor: outgoing
						? chatColors[theme.mode].outgoing
						: theme.background.primary,
					borderWidth: geometry.border,
					borderColor: outgoing ? chatColors[theme.mode].border : theme.border,
					paddingHorizontal: space.md,
					paddingVertical: space.xs,
				}}
			>
				{children}
				{stamp ? (
					<View style={{ alignSelf: "flex-end", paddingTop: space.xxs }}>
						<Text variant="navigation" tone="secondary">
							{stamp}
						</Text>
					</View>
				) : undefined}
			</View>
		</ThemeScope>
	);
	return (
		<View
			style={{
				paddingHorizontal: space.xs,
				paddingVertical: space.xxs,
				gap: space.xs,
			}}
		>
			{timeLabel ? (
				<View style={{ paddingTop: space.md, paddingBottom: space.xs }}>
					<Text variant="navigation" tone="secondary" align="center">
						{timeLabel}
					</Text>
				</View>
			) : undefined}
			<View
				onLayout={({ nativeEvent }): void =>
					setAvailableWidth(nativeEvent.layout.width)
				}
				style={{
					alignItems: outgoing ? "flex-end" : "flex-start",
					position: "relative",
				}}
			>
				<View
					style={{
						maxWidth: layout.maxWidth ?? "80%",
						minWidth: 0,
						flexShrink: 1,
						gap: space.half,
						marginLeft:
							avatarLabel && !outgoing ? geometry.compactAvatar + space.xs : 0,
					}}
				>
					{authorLabel ? (
						<View
							style={{
								paddingHorizontal: space.xxs,
								flexDirection: "row",
								alignItems: "center",
								gap: space.xs,
							}}
						>
							<Text variant="caption" weight="regular" lines={1}>
								{authorLabel}
							</Text>
						</View>
					) : undefined}
					<View style={{ position: "relative" }}>
						{avatarLabel && !outgoing ? (
							<View
								style={{
									position: "absolute",
									left: -(geometry.compactAvatar + space.xs),
									bottom: 0,
								}}
							>
								<Avatar name={avatarLabel} personId={authorId} compact />
							</View>
						) : undefined}
						{contextSurface ? contextSurface(bubble) : bubble}
						{reaction &&
						(reactionOpen ||
							showMessageReaction(actionsFocused, layout.separateMenu)) ? (
							<View
								style={{
									position: "absolute",
									top: 0,
									left: outgoing ? -(geometry.touch + space.xxs) : undefined,
									right: outgoing ? undefined : -(geometry.touch + space.xxs),
									width: geometry.touch,
									height: geometry.touch,
								}}
							>
								{reaction}
							</View>
						) : undefined}
						{actions ? (
							<MessageMenuPosition
								outgoing={outgoing}
								separate={layout.separateMenu}
							>
								{actions}
							</MessageMenuPosition>
						) : undefined}
					</View>
					{reactions}
				</View>
			</View>
		</View>
	);
};
