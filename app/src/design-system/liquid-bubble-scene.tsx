import { type ExpoWebGLRenderingContext, GLView } from "expo-gl";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import {
	createLiquidBubbleDynamics,
	type LiquidBubbleDrag,
	type LiquidBubbleFrame,
} from "./liquid-bubble-dynamics";
import {
	createLiquidBubbleRenderer,
	type LiquidBubbleRenderer,
} from "./liquid-bubble-renderer";
import { useTheme } from "./theme";
import { motion as motionTokens, space } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

type MeasureBubble = () => void;
type Scene = {
	register: (
		id: string,
		measure: MeasureBubble,
		paint: (x: number, y: number) => void,
		content?: ReactNode,
	) => () => void;
	place: (
		id: string,
		x: number,
		y: number,
		width: number,
		height: number,
	) => void;
	refresh: () => void;
	move: (
		id: string,
		x: number,
		y: number,
		velocityX: number,
		velocityY: number,
	) => void;
	release: () => void;
};
const LiquidDraggedContext = createContext<string | undefined>(undefined);

export const LiquidBubbleContext = createContext<Scene | undefined>(undefined);

export const LiquidBubbleScene = ({
	children,
	active = true,
}: {
	children: ReactNode;
	active?: boolean;
}): ReactElement => {
	const host = useRef<View>(null);
	const [dragged, setDragged] = useState<string>();
	const contents = useRef(new Map<string, ReactNode>());
	const overlay = useRef<
		| { renderer: LiquidBubbleRenderer; gl: ExpoWebGLRenderingContext }
		| undefined
	>(undefined);
	const overlayPosition = useSharedValue({ x: 0, y: 0 });
	const overlaySize = 88;
	const baseData = useRef(new Float32Array(512));
	const overlayData = useRef(new Float32Array(512));
	const indices = useRef(Array.from({ length: 64 }, (_, i): number => i));
	const overlayStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: overlayPosition.get().x },
			{ translateY: overlayPosition.get().y },
		],
	}));
	const overlayContext = useCallback((gl: ExpoWebGLRenderingContext): void => {
		overlay.current?.renderer.dispose();
		overlay.current = { renderer: createLiquidBubbleRenderer(gl), gl };
	}, []);

	const theme = useTheme();
	const motion = useMotion();
	const screenActive = useScreenActive();
	const preferences = useRef({
		dark: theme.mode === "dark",
		reduced: !motion,
		active: active && screenActive,
	});
	const state = useRef<{
		origin: { x: number; y: number; scaleX: number; scaleY: number };
		originReady: boolean;
		size: { width: number; height: number };
		frames: Map<string, LiquidBubbleFrame>;
		measures: Map<string, MeasureBubble>;
		paints: Map<string, (x: number, y: number) => void>;
		drag?: LiquidBubbleDrag;
		dragAt: number;
		grabOffset: { x: number; y: number };
		dragTranslation: { x: number; y: number };
		paintOffsets: Map<string, { x: number; y: number }>;
		resize: () => void;
		request: () => void;
		dispose: () => void;
	}>({
		origin: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
		originReady: false,
		size: { width: 0, height: 0 },
		frames: new Map<string, LiquidBubbleFrame>(),
		measures: new Map<string, MeasureBubble>(),
		paints: new Map<string, (x: number, y: number) => void>(),
		drag: undefined,
		dragAt: 0,
		grabOffset: { x: 0, y: 0 },
		dragTranslation: { x: 0, y: 0 },
		paintOffsets: new Map<string, { x: number; y: number }>(),
		resize: (): void => {},
		request: (): void => {},
		dispose: (): void => {},
	});
	const refreshFrame = useRef(0);
	const scene = useMemo<Scene>(
		() => ({
			register: (id, measure, paint, content) => {
				contents.current.set(id, content);
				state.current.paints.set(id, paint);
				state.current.measures.set(id, measure);
				measure();
				return (): void => {
					if (state.current.measures.get(id) === measure) {
						state.current.measures.delete(id);
						contents.current.delete(id);
						state.current.paints.delete(id);
						state.current.paintOffsets.delete(id);
						state.current.frames.delete(id);
						state.current.request();
					}
				};
			},
			place: (id, x, y, width, height): void => {
				if (!state.current.originReady || !state.current.measures.has(id))
					return;
				const held =
					state.current.drag?.id === id ? state.current.drag : undefined;
				state.current.frames.set(id, {
					x:
						(x - state.current.origin.x) / state.current.origin.scaleX -
						(held ? state.current.dragTranslation.x : 0),
					y:
						(y - state.current.origin.y) / state.current.origin.scaleY -
						(held ? state.current.dragTranslation.y : 0),
					width: width / state.current.origin.scaleX,
					height: height / state.current.origin.scaleY,
				});
				state.current.request();
			},
			refresh: (): void => {
				if (refreshFrame.current) return;
				refreshFrame.current = requestAnimationFrame((): void => {
					refreshFrame.current = 0;
					host.current?.measureInWindow((x, y, width, height): void => {
						state.current.origin = {
							x,
							y,
							scaleX:
								state.current.size.width > 0 && width > 0
									? width / state.current.size.width
									: 1,
							scaleY:
								state.current.size.height > 0 && height > 0
									? height / state.current.size.height
									: 1,
						};
						state.current.originReady = true;
						for (const measure of state.current.measures.values()) measure();
					});
				});
			},
			move: (id, x, y, velocityX, velocityY): void => {
				if (state.current.drag?.id !== id) setDragged(id);
				if (state.current.drag?.id !== id)
					state.current.grabOffset = state.current.paintOffsets.get(id) ?? {
						x: 0,
						y: 0,
					};
				state.current.dragTranslation = { x, y };
				state.current.drag = {
					id,
					x: x + state.current.grabOffset.x,
					y: y + state.current.grabOffset.y,
					velocityX,
					velocityY,
				};
				state.current.dragAt = performance.now();
				state.current.request();
			},
			release: (): void => {
				setDragged(undefined);
				state.current.drag = undefined;
				state.current.request();
			},
		}),
		[],
	);
	const context = useCallback(
		(gl: ExpoWebGLRenderingContext): void => {
			state.current.dispose();
			const renderer = createLiquidBubbleRenderer(gl);
			const dynamics = createLiquidBubbleDynamics();
			const playback = {
				frame: 0,
				last: performance.now(),
				disposed: false,
				until: performance.now() + motionTokens.duration.extended,
			};
			const draw = (now: number): void => {
				playback.frame = 0;
				if (playback.disposed || !preferences.current.active) return;
				const delta = Math.min((now - playback.last) / 1000, 0.05);
				playback.last = now;
				const drag = state.current.drag;
				const attenuation = Math.exp(
					-(now - state.current.dragAt) / motionTokens.duration.fast,
				);
				const frame = dynamics.update(
					state.current.frames,
					drag
						? {
								...drag,
								velocityX: drag.velocityX * attenuation,
								velocityY: drag.velocityY * attenuation,
							}
						: undefined,
					delta,
					preferences.current.reduced,
				);
				const cursor = { index: 0, dragged: -1 };
				for (const [id, location] of state.current.frames) {
					if (cursor.index >= frame.count) break;
					const held =
						state.current.drag?.id === id ? state.current.drag : undefined;
					if (held) cursor.dragged = cursor.index;
					const offset = {
						x:
							(frame.data.at(cursor.index * 8) ?? 0) -
							location.x -
							location.width / 2 -
							(held ? state.current.dragTranslation.x : 0),
						y:
							(frame.data.at(cursor.index * 8 + 1) ?? 0) -
							location.y -
							location.height / 2 -
							(held ? state.current.dragTranslation.y : 0),
					};
					state.current.paintOffsets.set(id, offset);
					state.current.paints.get(id)?.(offset.x, offset.y);
					cursor.index += 1;
				}
				baseData.current.set(frame.data);
				const lifted = cursor.dragged >= 0 && overlay.current;
				if (lifted && overlay.current) {
					const cx = frame.data.at(cursor.dragged * 8) ?? 0;
					const cy = frame.data.at(cursor.dragged * 8 + 1) ?? 0;
					overlayPosition.set({
						x: cx - overlaySize / 2,
						y: cy - overlaySize / 2,
					});
					overlayData.current.set(frame.data);
					for (const index of indices.current) {
						if (index >= frame.count) break;
						overlayData.current[index * 8] =
							(frame.data.at(index * 8) ?? 0) - cx + overlaySize / 2;
						overlayData.current[index * 8 + 1] =
							(frame.data.at(index * 8 + 1) ?? 0) - cy + overlaySize / 2;
					}
					overlay.current.renderer.draw(
						overlayData.current,
						frame.count,
						overlaySize,
						overlaySize,
						preferences.current.dark,
					);
					overlay.current.gl.flush();
					overlay.current.gl.endFrameEXP();
					baseData.current.copyWithin(
						cursor.dragged * 8,
						(frame.count - 1) * 8,
						frame.count * 8,
					);
				}
				renderer.draw(
					baseData.current,
					lifted ? frame.count - 1 : frame.count,
					state.current.size.width,
					state.current.size.height,
					preferences.current.dark,
				);
				gl.flush();
				gl.endFrameEXP();
				if (frame.moving || now < playback.until)
					playback.frame = requestAnimationFrame(draw);
			};
			state.current.request = (): void => {
				if (
					!playback.disposed &&
					!playback.frame &&
					preferences.current.active
				) {
					playback.last = performance.now();
					playback.frame = requestAnimationFrame(draw);
				}
			};
			state.current.resize = (): void => {
				playback.until = performance.now() + motionTokens.duration.extended;
				state.current.request();
			};
			state.current.dispose = (): void => {
				playback.disposed = true;
				cancelAnimationFrame(playback.frame);
				renderer.dispose();
			};
			state.current.request();
			scene.refresh();
		},
		[scene, overlayPosition],
	);
	useEffect(() => {
		preferences.current = {
			dark: theme.mode === "dark",
			reduced: !motion,
			active: active && screenActive,
		};
		state.current.request();
	}, [theme.mode, motion, active, screenActive]);
	useEffect(
		() => (): void => {
			cancelAnimationFrame(refreshFrame.current);
			state.current.dispose();
			overlay.current?.renderer.dispose();
		},
		[],
	);
	return (
		<LiquidBubbleContext value={scene}>
			<LiquidDraggedContext value={dragged}>
				<View
					ref={host}
					collapsable={false}
					onLayout={({ nativeEvent: { layout } }): void => {
						state.current.size = { width: layout.width, height: layout.height };
						scene.refresh();
						state.current.resize();
					}}
					style={{ position: "relative", gap: space.md }}
				>
					<View
						pointerEvents="none"
						accessible={false}
						importantForAccessibility="no-hide-descendants"
						style={StyleSheet.absoluteFill}
					>
						<GLView
							style={StyleSheet.absoluteFill}
							msaaSamples={4}
							onContextCreate={context}
						/>
					</View>
					{children}
					<Animated.View
						accessible={false}
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
						aria-hidden
						pointerEvents="none"
						style={[
							{
								position: "absolute",
								left: 0,
								top: 0,
								width: overlaySize,
								height: overlaySize,
								zIndex: 100,
								opacity: dragged ? 1 : 0,
							},
							overlayStyle,
						]}
					>
						<GLView
							onContextCreate={overlayContext}
							style={StyleSheet.absoluteFill}
							msaaSamples={4}
						/>
						<View
							style={{
								position: "absolute",
								inset: 0,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{dragged ? contents.current.get(dragged) : undefined}
						</View>
					</Animated.View>
				</View>
			</LiquidDraggedContext>
		</LiquidBubbleContext>
	);
};

export const LiquidBubble = ({
	id,
	size,
	children,
	overlay,
}: {
	id: string;
	overlay?: ReactNode;
	size: number;
	children: ReactNode;
}): ReactElement => {
	const scene = useContext(LiquidBubbleContext);
	const dragged = useContext(LiquidDraggedContext);
	const host = useRef<View>(null);
	const measure = useCallback((): void => {
		host.current?.measureInWindow((x, y, width, height): void =>
			scene?.place(id, x, y, width, height),
		);
	}, [id, scene]);
	const offset = useSharedValue({ x: 0, y: 0 });
	const latest = useRef({ x: 0, y: 0 });
	const paint = useCallback(
		(x: number, y: number): void => {
			if (
				Math.abs(x - latest.current.x) + Math.abs(y - latest.current.y) >
				0.05
			) {
				latest.current = { x, y };
				offset.set({ x, y });
			}
		},
		[offset],
	);
	const position = useAnimatedStyle(() => ({
		transform: [{ translateX: offset.get().x }, { translateY: offset.get().y }],
	}));
	useEffect(
		() => scene?.register(id, measure, paint, overlay),
		[scene, id, measure, paint, overlay],
	);
	return (
		<View
			ref={host}
			collapsable={false}
			onLayout={(): void => scene?.refresh()}
			style={{
				width: size,
				height: size,
				opacity: dragged === id ? 0 : 1,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Animated.View style={position}>{children}</Animated.View>
		</View>
	);
};
