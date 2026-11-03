import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ReactElement } from "react";
import { Stack } from "./stack";
import { Text } from "./text";

export const MediaVideoPlayer = ({
	uri,
	label,
	autoPlay = false,
}: {
	uri: string;
	label: string;
	autoPlay?: boolean;
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
				<Text variant="small" tone="danger">
					This device cannot play this video format.
				</Text>
			) : undefined}
		</Stack>
	);
};
