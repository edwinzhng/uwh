import type { ReactElement } from "react";
import type { TooltipContentProps } from "recharts";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const TrendTooltip = ({
	active,
	label,
	payload,
	formatValue,
}: Pick<TooltipContentProps<number, string>, "active" | "label" | "payload"> & {
	formatValue: (value: number) => string;
}): ReactElement | undefined => {
	const theme = useTheme();
	if (!active || !payload.length) return undefined;
	return (
		<div
			style={{
				background: theme.background.primary,
				color: theme.text.primary,
				border: `${geometry.border}px solid ${theme.border}`,
				borderRadius: corners.panel,
				padding: space.sm,
				display: "grid",
				gap: space.xs,
				minWidth: 140,
			}}
		>
			<div style={{ color: theme.text.secondary }}>
				{typeof label === "string" ? label : ""}
			</div>
			{payload.map((entry) => (
				<div
					key={entry.dataKey?.toString()}
					style={{ display: "flex", alignItems: "center", gap: space.sm }}
				>
					<span
						style={{
							width: space.xs,
							height: space.xs,
							background: entry.color,
							borderRadius: corners.pill,
						}}
					/>
					<span style={{ flex: 1 }}>{entry.name}</span>
					<strong style={{ fontVariantNumeric: "tabular-nums" }}>
						{typeof entry.value === "number" ? formatValue(entry.value) : "—"}
					</strong>
				</div>
			))}
		</div>
	);
};
