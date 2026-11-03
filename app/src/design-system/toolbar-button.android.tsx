import { lazy, type ReactElement, Suspense } from "react";
import { nativeFeatureAvailable } from "../platform/native-feature";
import { ToolbarButton as Fallback } from "./toolbar-button-fallback";
import type { ToolbarButtonProps } from "./toolbar-button-props";

const Available = lazy(() =>
	import("./toolbar-button-available.android")
		.then((module) => ({ default: module.NativeToolbarButton }))
		.catch(() => ({ default: Fallback })),
);

export const ToolbarButton = (props: ToolbarButtonProps): ReactElement =>
	nativeFeatureAvailable("ExpoUI") ? (
		<Suspense fallback={<Fallback {...props} />}>
			<Available {...props} />
		</Suspense>
	) : (
		<Fallback {...props} />
	);
