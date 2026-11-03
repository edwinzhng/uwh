import { useIsFocused } from "expo-router";
import { lazy, type ReactElement, Suspense, useEffect, useState } from "react";
import { AppState, TurboModuleRegistry, View } from "react-native";
import { youtubeThumbnail } from "../domain/resources";
import { videoEmbedUrl } from "../domain/video-embed";
import { Button } from "./button";
import { LoadingContent } from "./loading-content";
import { MediaPoster } from "./media-poster";
import { Stack } from "./stack";
import { Text } from "./text";

const NativeVideoEmbed = lazy(() => import("./native-video-embed"));

export const ExternalVideo = ({
	url,
	label,
}: {
	url: string;
	label: string;
}): ReactElement => {
	const focused = useIsFocused();
	const [requested, setRequested] = useState<string>();
	const [error, setError] = useState<string>();
	const embed = videoEmbedUrl(url);
	const available = Boolean(TurboModuleRegistry.get("RNCWebViewModule"));
	useEffect((): (() => void) => {
		const subscription = AppState.addEventListener("change", (state): void => {
			if (state !== "active") setRequested(undefined);
		});
		return (): void => subscription.remove();
	}, []);
	useEffect((): void => {
		if (!focused) setRequested(undefined);
	}, [focused]);
	if (!embed) return <Text tone="secondary">Video unavailable.</Text>;
	if (!available)
		return (
			<Text tone="secondary">Embedded video needs an updated app build.</Text>
		);
	const fail = (): void => {
		setRequested(undefined);
		setError("Could not load this video. Try again.");
	};
	return (
		<Stack gap="xs">
			{focused && requested === embed ? (
				<View style={{ width: "100%", aspectRatio: 16 / 9 }}>
					<Suspense fallback={<LoadingContent />}>
						<NativeVideoEmbed
							key={embed}
							embed={embed}
							label={label}
							onError={fail}
						/>
					</Suspense>
				</View>
			) : (
				<MediaPoster
					uri={youtubeThumbnail(url)}
					label={`Play ${label}`}
					onPress={(): void => {
						setError(undefined);
						setRequested(embed);
					}}
				/>
			)}
			{error ? (
				<Stack gap="xs">
					<Text tone="danger">{error}</Text>
					<Button
						label="Retry video"
						compact
						onPress={(): void => {
							setError(undefined);
							setRequested(embed);
						}}
					/>
				</Stack>
			) : undefined}
		</Stack>
	);
};
