import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import {
	type ReactElement,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import { LoadingPageContext } from "./loading-state";
import { MaterialTexture } from "./material-texture";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	categoryPalette,
	motion as motionTokens,
} from "./tokens";
import { useMotion } from "./use-motion";
import { usePageLoading } from "./use-page-loading";
import { useRenderActivity } from "./use-render-activity";
import { useScreenActive } from "./use-screen-active";
import { createWatercolorRenderer } from "./watercolor-renderer";
import { useWatercolorTuning, watercolorDefaults } from "./watercolor-tuning";

export const WatercolorShader = ({
	category,
	seed,
	animated = true,
}: {
	category: CategoryColor;
	seed?: string;
	animated?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const tuning = useWatercolorTuning() ?? watercolorDefaults;
	const active = useScreenActive();
	const motion = useMotion();
	const page = useContext(LoadingPageContext);
	const [presented, setPresented] = useState<string>();
	const [fallback, setFallback] = useState(false);
	const [failed, setFailed] = useState(false);
	const unavailable = useRef(false);
	const presentationFrame = useRef(0);
	const palette = categoryPalette[theme.mode][category];
	const [size, setSize] = useState({ width: 0, height: 0 });
	const phase = useRef(0);
	const surface = useRef("0:0");
	const preferences = useRef({
		active: active && motion && animated,
		tuning,
		palette,
		ground: theme.background.card,
		seed: materialVariation(seed ?? category) * 1000,
	});

	const lifecycle = useRef<
		{ draw: () => void; pause: () => void; dispose: () => void } | undefined
	>(undefined);
	const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext): void => {
		const renderer = createWatercolorRenderer(gl);
		const state = { frame: 0, time: phase.current, last: performance.now() };
		const render = (now: number): void => {
			const current = preferences.current;
			if (current.active)
				state.time +=
					(Math.min(now - state.last, 100) / 1000) * current.tuning.speed;
			state.last = now;
			phase.current = state.time;
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
			pause: (): void => cancelAnimationFrame(state.frame),
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
			active: active && motion && animated,
			tuning,
			palette,
			ground: theme.background.card,
			seed: materialVariation(seed ?? category) * 1000,
		};
		lifecycle.current?.draw();
	}, [
		active,
		motion,
		animated,
		tuning,
		palette,
		theme.background.card,
		seed,
		category,
	]);
	useRenderActivity((isActive): void => {
		preferences.current.active = motion && isActive && animated;
		if (preferences.current.active) lifecycle.current?.draw();
		else lifecycle.current?.pause();
	});
	useEffect(
		() => (): void => {
			lifecycle.current?.dispose();
			lifecycle.current = undefined;
			cancelAnimationFrame(presentationFrame.current);
		},
		[],
	);

	const surfaceKey = `${Math.round(size.width * PixelRatio.get())}:${Math.round(size.height * PixelRatio.get())}`;
	const painted = presented === surfaceKey;
	usePageLoading(page !== undefined && !painted && !fallback && !failed);
	useEffect(() => {
		if (painted || failed || fallback) return;
		const timeout = setTimeout((): void => {
			unavailable.current = true;
			setFallback(true);
		}, motionTokens.duration.extended);
		return (): void => clearTimeout(timeout);
	}, [painted, failed, fallback]);
	useEffect((): void => {
		if (!fallback && !failed) return;
		cancelAnimationFrame(presentationFrame.current);
		lifecycle.current?.dispose();
		lifecycle.current = undefined;
	}, [fallback, failed]);
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			onLayout={({ nativeEvent }): void => {
				const { width, height } = nativeEvent.layout;
				const nextSurface = `${Math.round(width * PixelRatio.get())}:${Math.round(height * PixelRatio.get())}`;
				if (nextSurface !== surface.current) {
					surface.current = nextSurface;
					lifecycle.current?.dispose();
					lifecycle.current = undefined;
				}
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
			<View
				style={[
					StyleSheet.absoluteFill,
					{ opacity: fallback || failed ? 1 : 0 },
				]}
			>
				<MaterialTexture
					category={category}
					seed={seed}
					animated={false}
					rounded={false}
				/>
			</View>
			{!failed && !fallback && size.width > 0 && size.height > 0 ? (
				<GLView
					key={surfaceKey}
					msaaSamples={0}
					onContextCreate={(gl): void => {
						if (surface.current !== surfaceKey || unavailable.current) return;
						try {
							onContextCreate(gl);
							cancelAnimationFrame(presentationFrame.current);
							presentationFrame.current = requestAnimationFrame((): void => {
								presentationFrame.current = requestAnimationFrame((): void => {
									if (surface.current === surfaceKey) setPresented(surfaceKey);
								});
							});
						} catch {
							unavailable.current = true;
							lifecycle.current?.dispose();
							lifecycle.current = undefined;
							setFailed(true);
						}
					}}
					style={[
						StyleSheet.absoluteFill,
						{ opacity: painted ? tuning.intensity : 0 },
					]}
				/>
			) : undefined}
		</View>
	);
};
