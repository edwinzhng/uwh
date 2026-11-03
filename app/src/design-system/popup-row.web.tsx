import { type ButtonHTMLAttributes, type ReactElement, useState } from "react";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { interactiveRow } from "./interactive-row-layout";
import type { PopupRowProps } from "./popup-row-props";
import { useTheme } from "./theme";
import { font, geometry, space, typography } from "./tokens";

export const PopupRow = ({
	label,
	icon,
	person,
	isSelected,
	isChecked,
	isDisabled,
	tone = "default",
	onSelect,
}: PopupRowProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [pressed, setPressed] = useState(false);
	const active =
		!isDisabled && (isSelected || isChecked || hovered || focused || pressed);
	const foreground =
		tone === "default" ? theme.text.primary : theme[tone].foreground;
	const selection: Pick<
		ButtonHTMLAttributes<HTMLButtonElement>,
		"role" | "aria-checked"
	> = isChecked !== undefined
		? { role: "checkbox", "aria-checked": isChecked }
		: isSelected !== undefined
			? { role: "radio", "aria-checked": isSelected }
			: {};
	return (
		<button
			type="button"
			{...selection}
			aria-label={label}
			disabled={isDisabled}
			onClick={onSelect}
			onFocus={(event): void =>
				setFocused(event.currentTarget.matches(":focus-visible"))
			}
			onBlur={(): void => setFocused(false)}
			onPointerEnter={(event): void =>
				setHovered(event.pointerType === "mouse")
			}
			onPointerLeave={(): void => {
				setHovered(false);
				setPressed(false);
			}}
			onPointerDown={(): void => setPressed(true)}
			onPointerUp={(): void => setPressed(false)}
			onPointerCancel={(): void => setPressed(false)}
			style={{
				boxSizing: "border-box",
				width: "100%",
				minHeight: interactiveRow.minHeight,
				display: "flex",
				alignItems: "center",
				gap: space.xs,
				padding: `${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px`,
				marginInline: 0,
				border: 0,
				borderRadius: interactiveRow.borderRadius,
				background: active
					? tone === "default"
						? theme.background.hover
						: theme.colorScales[tone].muted
					: "transparent",
				color: foreground,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				outline: focused ? `${geometry.focus}px solid ${theme.focus}` : "none",
				outlineOffset: interactiveRow.focusOffset,
				cursor: isDisabled ? "default" : "pointer",
				textAlign: "start",
			}}
		>
			{person ? (
				<Avatar name={person.name ?? label} personId={person.id} compact />
			) : icon ? (
				<Icon name={icon} tone={tone === "default" ? "secondary" : tone} />
			) : undefined}
			<span
				style={{
					flex: 1,
					minWidth: 0,
					fontFamily: font.regular,
					fontSize: typography.label.fontSize,
					lineHeight: `${typography.label.lineHeight}px`,
				}}
			>
				{label}
			</span>
			{isChecked !== undefined ? (
				<Icon
					name={isChecked ? "checkboxChecked" : "stop"}
					tone={tone === "default" ? "primary" : tone}
				/>
			) : (
				<span style={{ display: "flex", width: space.lg }}>
					{isSelected ? (
						<Icon name="check" tone={tone === "default" ? "primary" : tone} />
					) : undefined}
				</span>
			)}
		</button>
	);
};
