import type { ReactElement } from "react";
import { View } from "react-native";
import { RollingDigit } from "./rolling-digit";

type Props = { value: number; label: string };
export const RollingNumber = ({ value, label }: Props): ReactElement => {
	const digits = String(
		Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
	)
		.split("")
		.map((digit, index, all) => ({
			digit: Number(digit),
			place: all.length - index,
		}));
	return (
		<View
			accessible
			accessibilityRole="text"
			accessibilityLabel={`${value} ${label}`}
			accessibilityLiveRegion="polite"
		>
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				aria-hidden
				style={{ flexDirection: "row" }}
			>
				{digits.map(({ digit, place }) => (
					<RollingDigit key={place} digit={digit} />
				))}
			</View>
		</View>
	);
};
