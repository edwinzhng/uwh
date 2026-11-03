import type { ReactNode } from "react";
import type { MenuGroup } from "./picker-props";

export type ContextMenuControls = {
	open: () => void;
	trigger: ReactNode;
	triggerFocused: boolean;
	surface: (content: ReactNode) => ReactNode;
};

export type ContextActionMenuProps = {
	label: string;
	groups: readonly MenuGroup[];
	isDisabled?: boolean;
	children: (controls: ContextMenuControls) => ReactNode;
};
