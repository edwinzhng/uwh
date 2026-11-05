import { ShaderMount } from "@paper-design/shaders-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import { type CategoryColor, categoryPalette } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";
import { watercolorFragment } from "./watercolor-fragment";
import { useWatercolorTuning, watercolorDefaults } from "./watercolor-tuning";

const shaderColor = (hex: string): number[] => [
	Number.parseInt(hex.slice(1, 3), 16) / 255,
	Number.parseInt(hex.slice(3, 5), 16) / 255,
	Number.parseInt(hex.slice(5, 7), 16) / 255,
];
const WatercolorShader = ({
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
	const motion = useMotion();
	const active = useScreenActive();
	const element = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const node = element.current;
		if (!node) return;
		const observer = new IntersectionObserver((entries) =>
			setVisible(entries.some((entry) => entry.isIntersecting)),
		);
		observer.observe(node);
		return (): void => observer.disconnect();
	}, []);
	const variation = materialVariation(seed ?? category);
	const palette = categoryPalette[theme.mode][category];
	return (
		<div
			ref={element}
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				overflow: "hidden",
				background: palette.background,
			}}
		>
			{active && visible ? (
				<ShaderMount
					fragmentShader={watercolorFragment}
					uniforms={{
						u_seed: variation * 1000,
						u_grain: tuning.grain,
						u_smoothness: tuning.smoothness,
						u_base: shaderColor(palette.background),
						u_pigment: shaderColor(palette.foreground),
						u_ground: shaderColor(theme.background.card),
					}}
					speed={motion && animated ? tuning.speed : 0}
					frame={0}
					minPixelRatio={1}
					maxPixelCount={animated ? 80000 : 4000000}
					style={{ position: "absolute", inset: 0, opacity: tuning.intensity }}
				/>
			) : undefined}
		</div>
	);
};

export default WatercolorShader;
