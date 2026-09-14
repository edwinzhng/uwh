import { type ReactElement, useState } from "react";
import { Icon } from "./icon";
import type { SegmentOptionProps } from "./segment-option-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space } from "./tokens";

export const SegmentOption = ({
	label,
	icon,
	value,
	groupName,
	isSelected,
	isDisabled,
	isTabStop,
	showSelection,
	height,
	onSelect,
	onHoverChange,
}: SegmentOptionProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<label
			onMouseEnter={(): void => onHoverChange(true)}
			onMouseLeave={(): void => onHoverChange(false)}
			style={{
				position: "relative",
				display: "flex",
				boxSizing: "border-box",
				alignItems: "center",
				justifyContent: "center",
				minHeight: height,
				width: icon ? height : undefined,
				padding: `${control.paddingY - control.segmentInset}px ${icon ? space.none : control.paddingX}px`,
				borderRadius: icon ? corners.pill : corners.control,
				border: `${geometry.border}px solid transparent`,
				backgroundColor: showSelection
					? theme.background.selected
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
					color: isSelected ? theme.text.primary : theme.text.secondary,
				}}
			>
				{icon ? (
					<Icon
						name={icon}
						size="sm"
						tone={isSelected ? "primary" : "secondary"}
					/>
				) : (
					label
				)}
			</span>
		</label>
	);
};
