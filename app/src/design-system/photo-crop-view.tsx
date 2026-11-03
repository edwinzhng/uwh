import { type ReactElement, useMemo, useRef, useState } from "react";
import { Image, PanResponder, View } from "react-native";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const PhotoCropView = ({
	uri,
	width,
	height,
	region,
	onMove,
	isDisabled,
}: {
	uri: string;
	width: number;
	height: number;
	region: { originX: number; originY: number; width: number; height: number };
	onMove: (dx: number, dy: number, viewport: number) => void;
	isDisabled: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [viewport, setViewport] = useState<number>(geometry.chart);
	const drag = useRef({ x: 0, y: 0 });
	const responder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: (): boolean => !isDisabled,
				onMoveShouldSetPanResponder: (): boolean => !isDisabled,
				onPanResponderGrant: (): void => {
					drag.current = { x: 0, y: 0 };
				},
				onPanResponderMove: (_event, gesture): void => {
					const previous = drag.current;
					drag.current = { x: gesture.dx, y: gesture.dy };
					onMove(gesture.dx - previous.x, gesture.dy - previous.y, viewport);
				},
			}),
		[isDisabled, onMove, viewport],
	);
	const scale = viewport / region.width;
	return (
		<View
			{...responder.panHandlers}
			accessibilityLabel="Photo crop preview. Drag to reposition or use the position controls."
			onLayout={(event): void => setViewport(event.nativeEvent.layout.width)}
			style={{
				width: "100%",
				maxWidth: geometry.messageImage,
				aspectRatio: 1,
				alignSelf: "center",
				overflow: "hidden",
				borderRadius: corners.pill,
				backgroundColor: theme.background.secondary,
				borderWidth: geometry.border,
				borderColor: theme.controlBorder,
				cursor: isDisabled ? "auto" : "pointer",
			}}
		>
			<Image
				source={{ uri }}
				resizeMode="stretch"
				accessible={false}
				style={{
					position: "absolute",
					width: width * scale,
					height: height * scale,
					left: -region.originX * scale,
					top: -region.originY * scale,
				}}
			/>
		</View>
	);
};
