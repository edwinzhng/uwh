import type { ReactElement } from "react";
import type { YoutubeUploader } from "../backend/use-youtube-uploads";
import { Button, Stack, Text } from "../design-system";

export const YoutubeUploadStatus = ({
	youtube,
	admin,
	disabled,
	progress,
	onConnect,
}: {
	youtube: YoutubeUploader;
	admin: boolean;
	disabled: boolean;
	progress?: number;
	onConnect: () => void;
}): ReactElement => (
	<Stack gap="xs">
		<Text variant="small" tone="secondary">
			{youtube.channelName
				? `Uploads go to ${youtube.channelName}.`
				: youtube.configured
					? "An administrator needs to connect the club's YouTube channel."
					: "YouTube uploads need administrator setup first."}
		</Text>
		<Text variant="small" tone="secondary">
			Videos are unlisted. Anyone with the YouTube link can watch and reshare
			them, even if access in this app is removed. Keep the app open until the
			upload finishes.
		</Text>
		{admin && youtube.configured ? (
			<Button
				label={youtube.channelName ? "Reconnect YouTube" : "Connect YouTube"}
				variant="secondary"
				isDisabled={disabled}
				onPress={onConnect}
			/>
		) : undefined}
		{progress !== undefined ? (
			<Text variant="small">
				{progress === 100
					? "Uploaded to YouTube. Saving…"
					: `Uploading ${progress}%`}
			</Text>
		) : undefined}
	</Stack>
);
