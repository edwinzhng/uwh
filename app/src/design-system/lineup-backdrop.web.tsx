import {
	lazy,
	type ReactElement,
	Suspense,
	useEffect,
	useRef,
	useState,
} from "react";
import { Image } from "react-native";
import {
	motionEasingCss,
	motionEffects,
} from "../../../packages/design-system/src/motion";
import artwork from "../../assets/lineup-pool.png";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

const LineupLens = lazy(() => import("./lineup-lens.web"));

export const LineupBackdrop = ({
	active,
}: {
	active: boolean;
}): ReactElement => {
	const image = useRef<HTMLDivElement>(null);
	const playback = useRef<Animation | undefined>(undefined);
	const enabled = useMotion();
	const visible = useScreenActive();
	const dark = useTheme().mode === "dark";
	const [shaderAvailable, setShaderAvailable] = useState(false);
	useEffect((): void => {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("webgl2");
		if (!context) return;
		context.getExtension("WEBGL_lose_context")?.loseContext();
		setShaderAvailable(true);
	}, []);
	useEffect((): (() => void) | undefined => {
		if (!enabled || !image.current) return undefined;
		const animation = image.current.animate(
			[
				{ transform: "translate3d(-0.7%, -0.5%, 0) scale(1.06)" },
				{ transform: "translate3d(0.7%, 0.5%, 0) scale(1.06)" },
			],
			{
				duration: motionEffects.cardMaterialFlow,
				direction: "alternate",
				iterations: Number.POSITIVE_INFINITY,
				easing: motionEasingCss("in-out"),
			},
		);
		animation.pause();
		playback.current = animation;
		return (): void => {
			animation.cancel();
			playback.current = undefined;
		};
	}, [enabled]);
	useEffect((): void => {
		if (active && visible && enabled) playback.current?.play();
		else playback.current?.pause();
	}, [active, visible, enabled]);
	return (
		<div
			aria-hidden="true"
			data-lineup-backdrop
			style={{
				position: "absolute",
				inset: 0,
				borderRadius: "inherit",
				overflow: "hidden",
				pointerEvents: "none",
			}}
		>
			<div
				ref={image}
				style={{
					position: "absolute",
					inset: -12,
					transform: "scale(1.06)",
					opacity: 1,
				}}
			>
				<Image
					source={artwork}
					resizeMode="cover"
					blurRadius={2}
					style={{ position: "absolute", inset: 0 }}
				/>
				{shaderAvailable ? (
					<Suspense fallback={undefined}>
						<LineupLens />
					</Suspense>
				) : undefined}
			</div>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: dark
						? "linear-gradient(180deg,rgba(9,22,24,0.58),rgba(9,22,24,0.68))"
						: "linear-gradient(180deg,rgba(245,248,242,0.58),rgba(245,248,242,0.72))",
				}}
			/>
		</div>
	);
};
