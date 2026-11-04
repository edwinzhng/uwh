import { motionEffects } from "@uwhclub/design-system/tokens";
import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Image, PixelRatio, View } from "react-native";
import darkPuck from "../../assets/loading/loading-puck-dark.png";
import lightPuck from "../../assets/loading/loading-puck-light.png";
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
	const [fallback, setFallback] = useState(false);
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
				pause: () => void;
		  }
		| undefined
	>(undefined);
	const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext): void => {
		if (
			/software|swiftshader|llvmpipe/i.test(
				String(gl.getParameter(gl.RENDERER)),
			)
		) {
			setFallback(true);
			ready.current?.();
			return;
		}
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
		if (preferences.current.animate) lifecycle.current?.draw();
		else lifecycle.current?.pause();
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
			{fallback ? (
				<Image
					source={(appearance ?? theme.mode) === "dark" ? darkPuck : lightPuck}
					resizeMode="contain"
					style={{ width: size, height: size }}
				/>
			) : (
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
			)}
		</View>
	);
};
