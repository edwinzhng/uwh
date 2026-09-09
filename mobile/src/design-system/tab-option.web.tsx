import type { ReactElement } from "react";
import { Badge } from "./badge";
import type { TabOptionProps } from "./tab-option";
import { useTheme } from "./theme";
import { control, font, geometry, space } from "./tokens";
export const TabOption = ({
	label,
	staffRole,
	selected,
	disabled,
	onPress,
}: TabOptionProps): ReactElement => {
	const theme = useTheme();
	return (
		<button
			type="button"
			role="tab"
			aria-selected={selected}
			disabled={disabled}
			tabIndex={selected ? 0 : -1}
			onClick={onPress}
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
				next?.focus();
				next?.click();
			}}
			style={{
				minHeight: geometry.touch,
				display: "flex",
				alignItems: "center",
				gap: space.xs,
				padding: `0 ${space.xs}px`,
				border: 0,
				background: "transparent",
				cursor: "pointer",
				fontFamily: font.medium,
				fontSize: control.typography.fontSize,
				color: selected ? theme.text.primary : theme.text.secondary,
			}}
		>
			{label}
			{staffRole ? (
				<Badge
					label={staffRole === "coach" ? "Coach" : "Admin"}
					kind={staffRole}
					compact
				/>
			) : undefined}
		</button>
	);
};
