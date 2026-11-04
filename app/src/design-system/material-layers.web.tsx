import { motionEffects } from "@uwhclub/design-system/tokens";
import type { CSSProperties, ReactElement } from "react";
import { Image, StyleSheet } from "react-native";
import type { MaterialLayersProps } from "./material-layers-props";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

type LayerStyle = CSSProperties & {
	"--material-from": string;
	"--material-to": string;
	"--material-alpha-start": number;
	"--material-alpha-quarter": number;
	"--material-alpha-middle": number;
	"--material-alpha-three-quarter": number;
	"--material-alpha-end": number;
};
export const MaterialLayers = ({
	images,
	variation,
	animated,
}: MaterialLayersProps): ReactElement => {
	const active = useScreenActive();
	const motionEnabled = useMotion();
	const playing = animated && active && motionEnabled;
	const scale = `scale(${(variation > 0.5 ? -1 : 1) * 1.16},${(variation > 0.25 && variation < 0.75 ? -1 : 1) * 1.16})`;
	const base = (phase: number): string =>
		`${scale} translateX(${(phase + variation - 1) * space.xs}px)`;
	const wash = (phase: number): string =>
		`${scale} translateY(${(variation - phase) * space.xs}px)`;
	const alpha = (phase: number): number => {
		const value = (phase + variation * 2) % 2;
		return value > 1 ? 2 - value : value;
	};
	const layer: LayerStyle = {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
		animationDuration: `${motionEffects.cardMaterialFlow}ms`,
		animationTimingFunction: `cubic-bezier(${motion.easing["in-out"].join(",")})`,
		animationIterationCount: "infinite",
		animationDirection: "alternate",
		animationPlayState: playing ? "running" : "paused",
		"--material-from": base(0),
		"--material-to": base(1),
		"--material-alpha-start": alpha(0),
		"--material-alpha-quarter": alpha(0.25),
		"--material-alpha-middle": alpha(0.5),
		"--material-alpha-three-quarter": alpha(0.75),
		"--material-alpha-end": alpha(1),
	};
	const washLayer: LayerStyle = {
		...layer,
		"--material-from": wash(0),
		"--material-to": wash(1),
	};
	return (
		<>
			<div aria-hidden className="club-material-base" style={layer}>
				<Image source={images[0]} resizeMode="stretch" style={styles.image} />
			</div>
			<div aria-hidden className="club-material-wash" style={washLayer}>
				<Image source={images[1]} resizeMode="stretch" style={styles.image} />
			</div>
		</>
	);
};
const styles = StyleSheet.create({
	image: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
	},
});
