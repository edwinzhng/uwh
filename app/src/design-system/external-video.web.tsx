import { type ReactElement, useState } from "react";
import { youtubeThumbnail } from "../domain/resources";
import { videoEmbedUrl } from "../domain/video-embed";
import { MediaPoster } from "./media-poster";
import { Stack } from "./stack";
import { Text } from "./text";

export const ExternalVideo = ({
	url,
	label,
}: {
	url: string;
	label: string;
}): ReactElement => {
	const [requested, setRequested] = useState(false);
	const embed = videoEmbedUrl(url);
	if (!embed) return <Text tone="secondary">Video unavailable.</Text>;
	return (
		<Stack gap="xs">
			{requested && embed ? (
				<iframe
					title={label}
					src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
					loading="lazy"
					referrerPolicy="strict-origin-when-cross-origin"
					allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
					allowFullScreen
					style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
				/>
			) : (
				<MediaPoster
					uri={youtubeThumbnail(url)}
					label={`Play ${label}`}
					onPress={(): void => setRequested(true)}
				/>
			)}
		</Stack>
	);
};
