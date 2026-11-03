import Constants from "expo-constants";
import type { ReactElement } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { nativeVideoNavigationAllowed } from "../domain/native-video-navigation";

const NativeVideoEmbed = ({
	embed,
	label,
	onError,
}: {
	embed: string;
	label: string;
	onError: () => void;
}): ReactElement => {
	const applicationId =
		Platform.OS === "ios"
			? Constants.expoConfig?.ios?.bundleIdentifier
			: Constants.expoConfig?.android?.package;
	return (
		<WebView
			accessibilityLabel={label}
			source={{
				uri: `${embed}${embed.includes("?") ? "&" : "?"}playsinline=1`,
				headers: applicationId
					? { Referer: `https://${applicationId}/` }
					: undefined,
			}}
			originWhitelist={["*"]}
			onShouldStartLoadWithRequest={(request): boolean =>
				nativeVideoNavigationAllowed(embed, request.url)
			}
			onOpenWindow={(): void => {}}
			javaScriptCanOpenWindowsAutomatically={false}
			setSupportMultipleWindows
			allowsInlineMediaPlayback
			allowsFullscreenVideo
			mediaPlaybackRequiresUserAction
			mixedContentMode="never"
			allowFileAccess={false}
			allowFileAccessFromFileURLs={false}
			allowUniversalAccessFromFileURLs={false}
			sharedCookiesEnabled={false}
			thirdPartyCookiesEnabled={false}
			geolocationEnabled={false}
			scrollEnabled={false}
			bounces={false}
			onError={onError}
			onHttpError={onError}
			onContentProcessDidTerminate={onError}
			onRenderProcessGone={onError}
			style={{ flex: 1 }}
		/>
	);
};
export default NativeVideoEmbed;
