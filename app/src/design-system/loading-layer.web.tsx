import type { ReactElement } from "react";
import type { LoadingLayerProps } from "./loading-layer-props";
import { layer } from "./tokens";

export const LoadingLayer = ({
	children,
	fillViewport,
}: LoadingLayerProps): ReactElement => (
	<div
		style={{
			position: fillViewport ? "fixed" : "absolute",
			inset: 0,
			pointerEvents: "none",
			zIndex: fillViewport ? layer.modal : 1,
		}}
	>
		{children}
	</div>
);
