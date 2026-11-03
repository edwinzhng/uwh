import { type ReactElement, useState } from "react";
import { Icon } from "./icon";
import type { SegmentOptionProps } from "./segment-option-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry, radius, space } from "./tokens";

export const SegmentOption = ({
	label,
	icon,
	value,
	groupName,
	isSelected,
	indicatorReady = false,
	isDisabled,
	isTabStop,
	height,
	onSelect,
}: SegmentOptionProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const selectedBackground =
		theme.mode === "dark"
			? theme.background.selected
			: theme.background.primary;
	const foreground = isSelected ? theme.text.primary : theme.text.secondary;
	return (
		<label
			title={icon ? label : undefined}
			onMouseEnter={(): void => setHovered(true)}
			onMouseLeave={(): void => setHovered(false)}
			style={{
				position: "relative",
				display: "flex",
				boxSizing: "border-box",
				alignItems: "center",
				justifyContent: "center",
				minHeight: height,
				width: icon ? height : undefined,
				padding: `${control.paddingY - control.segmentInset}px ${icon ? space.none : control.paddingX}px`,
				borderRadius: icon ? radius.round : corners.control,
				border: `${geometry.border}px solid ${icon && isSelected && !indicatorReady ? theme.border : "transparent"}`,
				backgroundColor:
					isSelected && !indicatorReady
						? selectedBackground
						: hovered && !isSelected && !isDisabled
							? theme.background.hover
							: "transparent",
				outline: focused ? `${geometry.focus}px solid ${theme.focus}` : "none",
				outlineOffset: -geometry.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			}}
		>
			<input
				type="radio"
				name={groupName}
				value={value}
				aria-label={label}
				checked={isSelected}
				disabled={isDisabled}
				tabIndex={isTabStop && !isDisabled ? 0 : -1}
				onChange={onSelect}
				onFocus={(event): void =>
					setFocused(event.currentTarget.matches(":focus-visible"))
				}
				onBlur={(): void => setFocused(false)}
				onPointerDown={(): void => setFocused(false)}
				onKeyDown={(event): void => {
					setFocused(true);
					if (event.key === "Enter") {
						event.preventDefault();
						if (!event.repeat && !isSelected && !isDisabled) onSelect();
					}
				}}
				style={{
					position: "absolute",
					inset: 0,
					margin: 0,
					width: "100%",
					height: "100%",
					opacity: 0,
					cursor: isDisabled ? "default" : "pointer",
				}}
			/>
			<span
				style={{
					display: "flex",
					alignItems: "center",
					pointerEvents: "none",
					fontFamily: font.medium,
					fontSize: control.typography.fontSize,
					lineHeight: `${control.typography.lineHeight}px`,
					whiteSpace: "nowrap",
					color: foreground,
				}}
			>
				{icon ? <Icon name={icon} size="sm" color={foreground} /> : label}
			</span>
		</label>
	);
};
