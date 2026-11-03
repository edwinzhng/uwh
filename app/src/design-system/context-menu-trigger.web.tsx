import type { ReactElement } from "react";
import type { ContextMenuTriggerProps } from "./context-menu-trigger-props";
import { Icon } from "./icon";

export const ContextMenuTrigger = ({
	label,
	isOpen,
	isDisabled,
	onOpen,
	onFocusChange,
}: ContextMenuTriggerProps): ReactElement => (
	<button
		type="button"
		className="club-message-menu-trigger club-combo-action"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={isOpen}
		disabled={isDisabled}
		onClick={onOpen}
		onFocus={(): void => onFocusChange(true)}
		onBlur={(): void => onFocusChange(false)}
	>
		<Icon name="more" size="sm" tone="secondary" />
	</button>
);
