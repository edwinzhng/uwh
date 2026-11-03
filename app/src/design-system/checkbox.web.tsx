import type { ReactElement } from "react";
import { interactiveRow } from "./interactive-row-layout";
import { useTheme } from "./theme";
import { font, geometry, lightTheme, space, typography } from "./tokens";

export const Checkbox = ({
	label,
	checked,
	onChange,
	isDisabled = false,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	isDisabled?: boolean;
}): ReactElement => {
	const theme = useTheme();
	return (
		<label
			className="club-checkbox-row"
			data-disabled={isDisabled || undefined}
			style={{
				boxSizing: "border-box",
				display: "flex",
				alignItems: "center",
				gap: space.xs,
				minHeight: interactiveRow.minHeight,
				minWidth: geometry.touch,
				padding: `${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px`,
				marginInline: interactiveRow.gutter,
				borderRadius: interactiveRow.borderRadius,
				color: theme.text.primary,
				fontFamily: font[typography.small.family],
				fontSize: typography.small.fontSize,
				lineHeight: `${typography.small.lineHeight}px`,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				cursor: isDisabled ? "default" : "pointer",
			}}
		>
			<input
				disabled={isDisabled}
				type="checkbox"
				checked={checked}
				onChange={(event): void => onChange(event.currentTarget.checked)}
				style={{
					width: geometry.iconSmall,
					height: geometry.iconSmall,
					margin: 0,
					flexShrink: 0,
					accentColor: theme.accent.background,
					colorScheme: theme === lightTheme ? "light" : "dark",
					outlineColor: theme.focus,
					outlineOffset: geometry.focus,
					cursor: isDisabled ? "default" : "pointer",
				}}
			/>
			<span>{label}</span>
		</label>
	);
};
