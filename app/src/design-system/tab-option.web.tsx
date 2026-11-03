import type { ReactElement } from "react";
import type { TabOptionProps } from "./tab-option";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space } from "./tokens";
export const TabOption = ({
	label,
	selected,
	indicatorReady = false,
	disabled,
	onPress,
	onFocus,
}: TabOptionProps): ReactElement => {
	const theme = useTheme();
	return (
		<button
			type="button"
			role="tab"
			aria-selected={selected}
			disabled={disabled}
			tabIndex={selected ? 0 : -1}
			onClick={(event): void => onPress(event.detail === 0)}
			onFocus={onFocus}
			onKeyDown={(event): void => {
				if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
					return;
				const tabs = Array.from(
					event.currentTarget
						.closest('[role="tablist"]')
						?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ??
						[],
				);
				const index = tabs.indexOf(event.currentTarget);
				const next =
					event.key === "Home"
						? tabs.at(0)
						: event.key === "End"
							? tabs.at(-1)
							: tabs.at(
									(index +
										(event.key === "ArrowRight" ? 1 : -1) +
										tabs.length) %
										tabs.length,
								);
				event.preventDefault();
				next?.focus({ preventScroll: true });
				next?.click();
			}}
			style={{
				minHeight: geometry.touch,
				display: "flex",
				alignItems: "center",
				gap: space.xs,
				padding: `0 ${space.xs}px`,
				border: 0,
				background:
					selected && !indicatorReady
						? theme.mode === "dark"
							? theme.background.selected
							: theme.background.primary
						: "transparent",
				borderRadius: corners.control,
				opacity: disabled ? geometry.disabledOpacity : 1,
				cursor: "pointer",
				fontFamily: font.medium,
				fontSize: control.typography.fontSize,
				color: selected ? theme.text.primary : theme.text.secondary,
			}}
		>
			{label}
		</button>
	);
};
