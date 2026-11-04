import { motionEffects } from "@uwhclub/design-system/tokens";
import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { type ReactElement, useCallback, useEffect, useRef } from "react";
import { PixelRatio, Platform, View } from "react-native";
import { createPuckRenderer } from "./puck-renderer";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";
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
	const scale = Platform.OS === "web" ? Math.max(1, 2 / PixelRatio.get()) : 1;
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
			const elapsed = Math.min(
				now - state.last,
				motionEffects.loadingPuckLoop / 30,
			);
			state.last = now;
			if (preferences.current.animate && state.ready)
				state.phase =
					(state.phase +
						(elapsed / motionEffects.loadingPuckLoop) * Math.PI * 2) %
					(Math.PI * 2);
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
				msaaSamples={4}
				onContextCreate={onContextCreate}
			/>
		</View>
	);
};
