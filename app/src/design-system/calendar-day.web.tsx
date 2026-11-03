import { type ReactElement, useEffect, useRef, useState } from "react";
import type { CalendarDayProps } from "./calendar-day-props";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const CalendarDay = ({
	value,
	label,
	weekday,
	selected,
	today,
	muted,
	count,
	focusOnSelection,
	onPress,
	onNavigate,
}: CalendarDayProps): ReactElement => {
	const theme = useTheme();
	const ref = useRef<HTMLButtonElement>(null);
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	useEffect((): void => {
		if (selected && focusOnSelection) ref.current?.focus();
	}, [selected, focusOnSelection]);
	const foreground = selected
		? theme.accent.foreground
		: muted
			? theme.text.secondary
			: theme.text.primary;
	return (
		<button
			ref={ref}
			type="button"
			aria-label={label}
			aria-pressed={selected}
			aria-current={today ? "date" : undefined}
			tabIndex={selected ? 0 : -1}
			onClick={onPress}
			onMouseEnter={(): void => setHovered(true)}
			onMouseLeave={(): void => setHovered(false)}
			onFocus={(event): void =>
				setFocused(event.currentTarget.matches(":focus-visible"))
			}
			onBlur={(): void => setFocused(false)}
			onKeyDown={(event): void => {
				if (onNavigate(event.key)) {
					event.preventDefault();
					setFocused(true);
				}
			}}
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				minHeight: geometry.touch + space.xs,
				alignItems: "center",
				justifyContent: "center",
				gap: space.xxs,
				padding: `${weekday ? space.xs : space.xxs}px ${space.xxs}px`,
				borderRadius: corners.control,
				border: `${geometry.border}px solid ${today && !selected ? theme.accent.background : "transparent"}`,
				background: selected
					? theme.accent.background
					: hovered
						? theme.background.hover
						: "transparent",
				color: foreground,
				fontFamily: today || selected ? font.semibold : font.regular,
				fontSize: weekday
					? typography.label.fontSize
					: typography.small.fontSize,
				lineHeight: `${weekday ? typography.label.lineHeight : typography.small.lineHeight}px`,
				cursor: "pointer",
				outline: focused ? `${geometry.focus}px solid ${theme.focus}` : "none",
				outlineOffset: geometry.focus,
			}}
		>
			{weekday ? (
				<span
					style={{
						fontFamily: font.regular,
						fontSize: typography.navigation.fontSize,
						lineHeight: `${typography.navigation.lineHeight}px`,
					}}
				>
					{weekday}
				</span>
			) : undefined}
			{Number(value.slice(-2))}
			<span
				aria-hidden
				style={{
					height: space.xxs,
					width: space.xxs,
					borderRadius: corners.pill,
					background: count
						? selected
							? theme.accent.foreground
							: theme.accent.background
						: "transparent",
				}}
			/>
		</button>
	);
};
