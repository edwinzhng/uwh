import { lazy, type ReactElement, Suspense } from "react";
import { nativeFeatureAvailable } from "../platform/native-feature";
import { Text } from "./text";

const UnavailableAudio = (): ReactElement => (
	<Text variant="small" tone="secondary">
		Rebuild app to use audio.
	</Text>
);

const AudioPlayer = lazy(() =>
	import("./media-audio-player")
		.then((module) => ({ default: module.MediaAudioPlayer }))
		.catch(() => ({ default: UnavailableAudio })),
);

export const MediaAudio = ({
	uri,
	label = "voice note",
}: {
	uri: string;
	label?: string;
}): ReactElement => {
	return nativeFeatureAvailable("ExpoAudio") ? (
		<Suspense fallback={<Text variant="caption">Loading audio…</Text>}>
			<AudioPlayer uri={uri} label={label} />
		</Suspense>
	) : (
		<UnavailableAudio />
	);
};
