import { lazy, type ReactElement, Suspense } from "react";
import { nativeFeatureAvailable } from "../platform/native-feature";
import { Text } from "./text";

const UnavailableVideo = (): ReactElement => (
	<Text variant="small" tone="secondary">
		Rebuild app to use video.
	</Text>
);

const VideoPlayer = lazy(() =>
	import("./media-video-player")
		.then((module) => ({ default: module.MediaVideoPlayer }))
		.catch(() => ({ default: UnavailableVideo })),
);

export const MediaVideo = ({
	uri,
	label,
	autoPlay = false,
}: {
	uri: string;
	label: string;
	autoPlay?: boolean;
}): ReactElement => {
	return nativeFeatureAvailable("ExpoVideo") ? (
		<Suspense fallback={<Text variant="caption">Loading video…</Text>}>
			<VideoPlayer uri={uri} label={label} autoPlay={autoPlay} />
		</Suspense>
	) : (
		<UnavailableVideo />
	);
};
