import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Avatar } from "./avatar";
import { corners, font, geometry, radius, space, typography } from "./tokens";

export const LineupPlayerPortrait = ({
	name,
	personId,
	displayName,
	substitute = false,
	field = false,
	diameter = geometry.touch + space.xs * 2,
}: {
	name: string;
	personId: string;
	displayName?: string;
	substitute?: boolean;
	field?: boolean;
	diameter?: number;
}): ReactElement => (
	<View
		style={{
			width: diameter,
			height: diameter,
			borderRadius: radius.round,
			borderWidth: 2,
			borderColor: "#009B66",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "#FFFFFF",
		}}
	>
		<Avatar
			name={name}
			personId={personId}
			initials
			bright
			diameter={diameter - 4}
		/>
		{substitute ? (
			<Text
				numberOfLines={1}
				style={{
					position: "absolute",
					top: 0,
					color: "#4C3000",
					backgroundColor: "#FFCA39",
					fontFamily: font.semibold,
					fontSize: typography.navigation.fontSize,
					paddingHorizontal: space.xxs,
				}}
			>
				SUB
			</Text>
		) : undefined}
		<View
			style={{
				position: "absolute",
				bottom: -space.xxs,
				width: "100%",
				height: field
					? Math.max(typography.small.lineHeight + space.xxs, diameter * 0.3)
					: typography.navigation.lineHeight + space.xxs,
				borderRadius: corners.control,
				backgroundColor: "#008F60",
				alignItems: "center",
				justifyContent: "flex-start",
			}}
		>
			<Text
				numberOfLines={1}
				adjustsFontSizeToFit
				minimumFontScale={0.7}
				style={{
					width: "100%",
					textAlign: "center",
					color: "#FFFFFF",
					fontFamily: font.semibold,
					fontSize: field
						? Math.max(
								10,
								Math.min(
									typography.small.fontSize,
									(diameter * 1.35) / (displayName ?? name).length,
								),
							)
						: typography.navigation.fontSize,
					lineHeight: field
						? typography.small.lineHeight
						: typography.navigation.lineHeight,
				}}
			>
				{displayName ?? name}
			</Text>
		</View>
	</View>
);
