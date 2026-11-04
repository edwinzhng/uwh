import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import { type CategoryColor, categoryPalette } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";
import { createWatercolorRenderer } from "./watercolor-renderer";
import { useWatercolorTuning, watercolorDefaults } from "./watercolor-tuning";

export const WatercolorShader = ({
	category,
	seed,
}: {
	category: CategoryColor;
	seed?: string;
}): ReactElement => {
	const theme = useTheme();
	const tuning = useWatercolorTuning() ?? watercolorDefaults;
	const active = useScreenActive();
	const motion = useMotion();
	const palette = categoryPalette[theme.mode][category];
	const [size, setSize] = useState({ width: 0, height: 0 });
	const preferences = useRef({
		active: active && motion,
		tuning,
		palette,
		ground: theme.background.card,
		seed: materialVariation(seed ?? category) * 1000,
	});

	const lifecycle = useRef<
		{ draw: () => void; dispose: () => void } | undefined
	>(undefined);
	const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext): void => {
		const renderer = createWatercolorRenderer(gl);
		const state = { frame: 0, time: 0, last: performance.now() };
		const render = (now: number): void => {
			const current = preferences.current;
			if (current.active)
				state.time +=
					(Math.min(now - state.last, 100) / 1000) * current.tuning.speed;
			state.last = now;
			renderer.draw({
				time: state.time,
				seed: current.seed,
				grain: current.tuning.grain,
				smoothness: current.tuning.smoothness,
				base: current.palette.background,
				pigment: current.palette.foreground,
				ground: current.ground,
			});
			gl.flush();
			gl.endFrameEXP();
			if (current.active) state.frame = requestAnimationFrame(render);
		};
		lifecycle.current?.dispose();
		lifecycle.current = {
			draw: (): void => {
				cancelAnimationFrame(state.frame);
				state.last = performance.now();
				render(state.last);
			},
			dispose: (): void => {
				cancelAnimationFrame(state.frame);
				renderer.dispose();
			},
		};
		render(state.last);
	}, []);
	useEffect((): void => {
		preferences.current = {
			active: active && motion,
			tuning,
			palette,
			ground: theme.background.card,
			seed: materialVariation(seed ?? category) * 1000,
		};
		lifecycle.current?.draw();
	}, [active, motion, tuning, palette, theme.background.card, seed, category]);
	useEffect(
		() => (): void => {
			lifecycle.current?.dispose();
			lifecycle.current = undefined;
		},
		[],
	);
	const scale = Math.min(
		1,
		Math.sqrt(80000 / Math.max(1, size.width * size.height)) / PixelRatio.get(),
	);
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			onLayout={({ nativeEvent }): void => {
				const { width, height } = nativeEvent.layout;
				setSize((previous) =>
					previous.width === width && previous.height === height
						? previous
						: { width, height },
				);
			}}
			style={[
				StyleSheet.absoluteFill,
				{ overflow: "hidden", backgroundColor: palette.background },
			]}
		>
			{size.width > 0 && size.height > 0 ? (
				<GLView
					msaaSamples={0}
					onContextCreate={onContextCreate}
					style={{
						width: size.width * scale,
						height: size.height * scale,
						transform: [{ scale: 1 / scale }],
						transformOrigin: "top left",
						opacity: tuning.intensity,
					}}
				/>
			) : undefined}
		</View>
	);
};
