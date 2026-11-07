import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ReactElement } from "react";
import { Button } from "./button";
import { Stack } from "./stack";
import { Text } from "./text";

export const MediaVideoPlayer = ({
	uri,
	label,
	autoPlay = false,
	onRetry,
}: {
	uri: string;
	label: string;
	autoPlay?: boolean;
	onRetry?: () => void;
}): ReactElement => {
	const player = useVideoPlayer(uri, (instance): void => {
		if (autoPlay) instance.play();
	});
	const status = useEvent(player, "statusChange", { status: player.status });
	return (
		<Stack gap="xs">
			<VideoView
				player={player}
				accessibilityLabel={label}
				nativeControls
				fullscreenOptions={{ enable: true }}
				contentFit="contain"
				style={{ width: "100%", aspectRatio: 16 / 9 }}
			/>
			{status.status === "error" ? (
				<Stack gap="xs">
					<Text variant="small" tone="danger">
						Could not play this video.
					</Text>
					{onRetry ? (
						<Button
							label="Retry video"
							compact
							variant="secondary"
							onPress={onRetry}
						/>
					) : undefined}
				</Stack>
			) : undefined}
		</Stack>
	);
};
