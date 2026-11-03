import type { ReactElement } from "react";
import { ActivityIndicator, Platform } from "react-native";
import { ContentReveal } from "./content-reveal";
import { control, geometry } from "./tokens";

import { useMotion } from "./use-motion";

export const ButtonSpinner = ({ color }: { color: string }): ReactElement => {
	const canAnimate = useMotion();
	const isIOS = Platform.OS === "ios";
	return (
		<ContentReveal>
			<ActivityIndicator
				color={color}
				animating={canAnimate}
				hidesWhenStopped={false}
				size={isIOS ? "small" : control.spinner}
				style={{
					width: control.icon,
					height: control.typography.lineHeight,
					transform: [
						{
							scale: isIOS ? control.spinner / geometry.nativeSpinnerSmall : 1,
						},
					],
				}}
			/>
		</ContentReveal>
	);
};
