import { type ReactElement, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, layer, space } from "./tokens";

type Props = {
	name: string;
	uri?: string;
	failed?: boolean;
	onRetry: () => void;
	onRemove?: () => void;
	disabled?: boolean;
};
export const MessagePhotoView = ({
	name,
	uri,
	failed,
	onRetry,
	onRemove,
	disabled,
}: Props): ReactElement => {
	const theme = useTheme();
	const [open, setOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const [failedUri, setFailedUri] = useState<string>();
	const unavailable = failed || Boolean(uri && uri === failedUri);
	return (
		<View
			style={{
				width: "100%",
				maxWidth: onRemove ? geometry.popupWidth : geometry.messageImage,
				gap: space.xxs,
			}}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`Open photo: ${name}`}
				disabled={!uri || unavailable}
				onPress={(): void => setOpen(true)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={{
					aspectRatio: 4 / 3,
					backgroundColor: theme.background.secondary,
					borderRadius: corners.panel,
					borderWidth: geometry.border,
					borderColor: theme.border,
					overflow: "hidden",
					alignItems: "center",
					justifyContent: "center",
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
				}}
			>
				{uri && !unavailable ? (
					<Image
						source={{ uri }}
						accessibilityLabel={name}
						resizeMode="cover"
						onError={(): void => setFailedUri(uri)}
						style={{ width: "100%", height: "100%" }}
					/>
				) : (
					<Text variant="caption" tone="secondary">
						{unavailable ? "Photo unavailable" : "Loading photo…"}
					</Text>
				)}
			</Pressable>
			{unavailable ? (
				<Button
					label="Retry photo"
					variant="ghost"
					onPress={(): void => {
						setFailedUri(undefined);
						onRetry();
					}}
				/>
			) : undefined}
			{onRemove ? (
				<View
					style={{
						position: "absolute",
						right: space.xxs,
						top: space.xxs,
						zIndex: layer.raised,
						borderRadius: corners.control,
						backgroundColor: theme.background.primary,
					}}
				>
					<IconButton
						label={`Remove ${name}`}
						icon="close"
						onPress={onRemove}
						isDisabled={disabled}
					/>
				</View>
			) : undefined}
			<Dialog title="Photo" isOpen={open} onOpenChange={setOpen} footer={false}>
				{uri ? (
					<Image
						source={{ uri }}
						accessibilityLabel={name}
						resizeMode="contain"
						style={{ width: "100%", aspectRatio: 1 }}
					/>
				) : undefined}
			</Dialog>
		</View>
	);
};
