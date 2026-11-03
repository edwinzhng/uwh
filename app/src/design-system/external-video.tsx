import { type ReactElement, useState } from "react";
import { Linking } from "react-native";
import { nativeFeatureAvailable } from "../platform/native-feature";
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
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const hasBrowser = nativeFeatureAvailable("ExpoWebBrowser");
	const open = async (): Promise<void> => {
		if (busy) return;
		setBusy(true);
		setError(undefined);
		try {
			if (hasBrowser) {
				const { openBrowserAsync } = await import("expo-web-browser");
				await openBrowserAsync(url);
			} else await Linking.openURL(url);
		} catch {
			setError("Could not open this video. Try again.");
		} finally {
			setBusy(false);
		}
	};
	return (
		<Stack gap="xs">
			<Button
				label={`Watch ${label}`}
				isLoading={busy}
				onPress={(): void => {
					void open();
				}}
			/>
			<Text variant="caption" tone="secondary">
				{hasBrowser
					? "Opens in the in-app browser. Close it to return to feedback."
					: "Opens in your browser. Return to the app for feedback."}
			</Text>
			{error ? <Text tone="danger">{error}</Text> : undefined}
		</Stack>
	);
};
