import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { type ReactElement, useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
	createLiquidBubbleRenderer,
	type LiquidBubbleRenderer,
} from "./liquid-bubble-renderer";
import { useTheme } from "./theme";
import { corners, motion } from "./tokens";

export const LiquidPanelBackdrop = (): ReactElement => {
	const theme = useTheme();
	const state = useRef<{
		width: number;
		height: number;
		dark: boolean;
		renderer?: LiquidBubbleRenderer;
		gl?: ExpoWebGLRenderingContext;
	}>({ width: 0, height: 0, dark: theme.mode === "dark" });
	const playback = useRef({ frame: 0, until: 0 });
	const data = useRef(new Float32Array(512));
	const draw = useCallback((): void => {
		playback.current.frame = 0;
		const { renderer, gl, width, height, dark } = state.current;
		if (!renderer || !gl || !width || !height) return;
		data.current.set([
			width / 2,
			height / 2,
			Math.max(1, width / 2 - 1),
			Math.max(1, height / 2 - 1),
			corners.overlay,
			1,
			0,
			1,
		]);
		renderer.draw(data.current, 1, width, height, dark);
		gl.flush();
		gl.endFrameEXP();
		if (performance.now() < playback.current.until)
			playback.current.frame = requestAnimationFrame(draw);
	}, []);
	const request = useCallback((): void => {
		cancelAnimationFrame(playback.current.frame);
		playback.current.until = performance.now() + motion.duration.extended;
		playback.current.frame = requestAnimationFrame(draw);
	}, [draw]);
	const context = useCallback(
		(gl: ExpoWebGLRenderingContext): void => {
			state.current.renderer?.dispose();
			state.current.renderer = createLiquidBubbleRenderer(gl);
			state.current.gl = gl;
			request();
		},
		[request],
	);
	useEffect(() => {
		state.current.dark = theme.mode === "dark";
		request();
	}, [theme.mode, request]);
	useEffect(
		() => (): void => {
			cancelAnimationFrame(playback.current.frame);
			state.current.renderer?.dispose();
		},
		[],
	);
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			onLayout={({ nativeEvent: { layout } }): void => {
				state.current.width = layout.width;
				state.current.height = layout.height;
				request();
			}}
			style={StyleSheet.absoluteFill}
		>
			<GLView
				onContextCreate={context}
				msaaSamples={4}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
};
