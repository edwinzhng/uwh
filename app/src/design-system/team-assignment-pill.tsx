import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { font, geometry, palette, radius, space, typography } from "./tokens";

export const TeamAssignmentPill = ({
	team,
	label,
}: {
	team: "Black" | "White";
	label: string;
}): ReactElement => (
	<View
		style={{
			alignSelf: "flex-start",
			maxWidth: "100%",
			backgroundColor: team === "Black" ? palette.black : palette.white,
			borderColor: team === "Black" ? palette.black : "#A8B9AD",
			borderWidth: geometry.border,
			borderRadius: radius.round,
			paddingHorizontal: space.sm,
			paddingVertical: space.xxs,
		}}
	>
		<Text
			style={{
				fontFamily: font.semibold,
				fontSize: typography.body.fontSize,
				lineHeight: typography.body.lineHeight,
				color: team === "Black" ? palette.white : palette.black,
			}}
		>
			{label}
		</Text>
	</View>
);
