import { motionEffects } from "@uwhclub/design-system/tokens";
import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { type ReactElement, useCallback, useEffect, useRef } from "react";
import { PixelRatio, View } from "react-native";
import { advancePuckPhase } from "./puck-motion";
import { createPuckRenderer } from "./puck-renderer";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";
import { useRenderActivity } from "./use-render-activity";
import { useScreenActive } from "./use-screen-active";
export const LoadingPuck = ({
	size = 300,
	appearance,
	onReady,
}: {
	size?: number;
	appearance?: "light" | "dark";
	onReady?: () => void;
}): ReactElement => {
	const theme = useTheme();
	const ready = useRef(onReady);
	ready.current = onReady;
	const scale = Math.min(2, 2 / PixelRatio.get());
	const canAnimate = useMotion();
	const active = useScreenActive();
	const preferences = useRef({
		dark: (appearance ?? theme.mode) === "dark",
		animate: canAnimate && active,
	});

	const lifecycle = useRef<
		| {
				dispose: () => void;
				draw: () => void;
		  }
		| undefined
	>(undefined);
	const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext): void => {
		const renderer = createPuckRenderer(gl);
		const state = {
			frame: 0,
			phase: 0,
			last: performance.now(),
			ready: false,
		};
		const render = (now: number): void => {
			if (preferences.current.animate && state.ready)
				state.phase = advancePuckPhase(
					state.phase,
					now - state.last,
					motionEffects.loadingPuckLoop,
				);
			state.last = now;
			renderer.draw(state.phase, preferences.current.dark);
			gl.flush();
			gl.endFrameEXP();
			if (!state.ready) {
				state.ready = true;
				ready.current?.();
			}
			if (preferences.current.animate)
				state.frame = requestAnimationFrame(render);
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
		render(performance.now());
	}, []);
	useEffect(() => {
		preferences.current = {
			dark: (appearance ?? theme.mode) === "dark",
			animate: canAnimate && active,
		};
		lifecycle.current?.draw();
	}, [appearance, theme.mode, canAnimate, active]);
	useRenderActivity((isActive): void => {
		preferences.current.animate = canAnimate && isActive;
		lifecycle.current?.draw();
	});
	useEffect(
		() => (): void => {
			lifecycle.current?.dispose();
			lifecycle.current = undefined;
		},
		[],
	);
	return (
		<View
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={{ width: size, height: size, pointerEvents: "none" }}
		>
			<GLView
				style={{
					width: size * scale,
					height: size * scale,
					transform: [{ scale: 1 / scale }],
					transformOrigin: "top left",
				}}
				msaaSamples={0}
				onContextCreate={onContextCreate}
			/>
		</View>
	);
};
