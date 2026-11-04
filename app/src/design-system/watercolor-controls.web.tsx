import type { ReactElement } from "react";
import { useTheme } from "./theme";
import { font, space, typography } from "./tokens";
import type { WatercolorControlsProps } from "./watercolor-controls";

const controls = [
	{ key: "grain", label: "Grain", max: 1 },
	{ key: "speed", label: "Speed", max: 2 },
	{ key: "smoothness", label: "Smoothness", max: 1 },
	{ key: "intensity", label: "Color intensity", max: 1 },
] as const;
export const WatercolorControls = ({
	value,
	onChange,
	onCommit,
}: WatercolorControlsProps): ReactElement => {
	const theme = useTheme();
	return (
		<div style={{ display: "grid", gap: space.sm }}>
			{controls.map((control) => (
				<label
					key={control.key}
					style={{
						display: "grid",
						gap: space.xxs,
						color: theme.text.primary,
						fontFamily: font.medium,
						fontSize: typography.small.fontSize,
					}}
				>
					<span style={{ display: "flex", justifyContent: "space-between" }}>
						<span>{control.label}</span>
						<output>{value[control.key].toFixed(2)}</output>
					</span>
					<input
						aria-label={control.label}
						type="range"
						min={0}
						max={control.max}
						step={0.01}
						value={value[control.key]}
						onChange={(event) =>
							onChange({
								...value,
								[control.key]: Number(event.currentTarget.value),
							})
						}
						onPointerUp={(event) =>
							onCommit({
								...value,
								[control.key]: Number(event.currentTarget.value),
							})
						}
						onKeyUp={(event) =>
							onCommit({
								...value,
								[control.key]: Number(event.currentTarget.value),
							})
						}
						onBlur={(event) =>
							onCommit({
								...value,
								[control.key]: Number(event.currentTarget.value),
							})
						}
						style={{
							width: "100%",
							margin: 0,
							minHeight: 44,
							accentColor: theme.accent.background,
						}}
					/>
				</label>
			))}
		</div>
	);
};
