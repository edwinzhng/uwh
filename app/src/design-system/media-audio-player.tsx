import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { ReactElement } from "react";
import { Button } from "./button";
import { Row } from "./row";
import { Text } from "./text";

export const MediaAudioPlayer = ({
	uri,
	label,
}: {
	uri: string;
	label: string;
}): ReactElement => {
	const player = useAudioPlayer(uri);
	const status = useAudioPlayerStatus(player);
	return (
		<Row>
			<Button
				label={status.playing ? `Pause ${label}` : `Play ${label}`}
				variant="secondary"
				isDisabled={!status.isLoaded}
				onPress={(): void => {
					if (status.playing) player.pause();
					else if (
						status.didJustFinish ||
						(status.duration > 0 && status.currentTime >= status.duration)
					)
						void player.seekTo(0).then((): void => player.play());
					else player.play();
				}}
			/>
			<Text variant="caption" tone="secondary">
				{Math.floor(status.currentTime)} / {Math.ceil(status.duration)} s
			</Text>
		</Row>
	);
};
