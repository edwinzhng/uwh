import { lazy, type ReactElement, Suspense } from "react";
import { View } from "react-native";
import { emojiBrowserMetrics } from "./emoji-browser-model";
import type { EmojiPickerProps } from "./emoji-picker-props";
import { LoadingContent } from "./loading-content";

const Browser = lazy(() =>
	import("./emoji-browser").then((module) => ({
		default: module.EmojiBrowser,
	})),
);
export const EmojiPicker = (props: EmojiPickerProps): ReactElement => (
	<Suspense
		fallback={
			<View style={{ height: emojiBrowserMetrics.gridMaxHeight }}>
				<LoadingContent />
			</View>
		}
	>
		<Browser {...props} />
	</Suspense>
);
