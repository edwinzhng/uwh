import { type ReactElement, useState } from "react";
import { videoEmbedUrl } from "../domain/video-embed";
import { Button } from "./button";
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
	return (
		<Stack gap="xs">
			{requested && embed ? (
				<iframe
					title={label}
					src={embed}
					loading="lazy"
					referrerPolicy="strict-origin-when-cross-origin"
					allow="fullscreen; picture-in-picture; encrypted-media"
					allowFullScreen
					style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
				/>
			) : embed ? (
				<Button label="Load video" onPress={(): void => setRequested(true)} />
			) : undefined}
			<Button
				label={embed ? "Open on video site" : `Watch ${label}`}
				variant="secondary"
				onPress={(): void => {
					window.open(url, "_blank", "noopener,noreferrer");
				}}
			/>
			{!requested && embed ? (
				<Text variant="caption" tone="secondary">
					The video provider loads only when you choose to play.
				</Text>
			) : undefined}
		</Stack>
	);
};
