import { type ReactElement, useState } from "react";
import type { SwitchProps } from "./switch-props";
import { SwitchTrack } from "./switch-track";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const SwitchControl = ({
	label,
	description,
	value,
	onValueChange,
	isDisabled,
}: SwitchProps): ReactElement => {
	const [focused, setFocused] = useState(false);
	const theme = useTheme();
	return (
		<button
			type="button"
			role="switch"
			aria-label={label}
			aria-description={description}
			aria-checked={value}
			aria-keyshortcuts="Space Enter"
			tabIndex={isDisabled ? -1 : 0}
			disabled={isDisabled}
			onClick={(): void => onValueChange(!value)}
			onFocus={(event): void =>
				setFocused(event.currentTarget.matches(":focus-visible"))
			}
			onBlur={(): void => setFocused(false)}
			onPointerDown={(): void => setFocused(false)}
			onKeyDown={(): void => setFocused(true)}
			style={{
				appearance: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				minWidth: geometry.touch,
				minHeight: geometry.touch,
				padding: 0,
				border: 0,
				borderRadius: corners.control,
				backgroundColor: "transparent",
				outline: focused ? `${geometry.focus}px solid ${theme.focus}` : "none",
				outlineOffset: geometry.focus,
				cursor: isDisabled ? "default" : "pointer",
			}}
		>
			<SwitchTrack value={value} isFocused={false} isDisabled={isDisabled} />
		</button>
	);
};
