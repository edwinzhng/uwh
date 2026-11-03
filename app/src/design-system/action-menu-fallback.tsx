import { type ReactElement, useState } from "react";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { MenuRows } from "./menu-rows";
import type { ActionMenuProps } from "./picker-props";
import { PickerTrigger } from "./picker-trigger";

export const ActionMenu = ({
	label,
	accessibilityLabel,
	compact,
	icon,
	groups,
	isDisabled,
}: ActionMenuProps): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			{icon ? (
				<IconButton
					label={accessibilityLabel ?? label}
					icon={icon}
					isDisabled={isDisabled}
					onPress={(): void => setOpen(true)}
				/>
			) : (
				<PickerTrigger
					kind="action"
					label={accessibilityLabel ?? label}
					compact={compact}
					value={label}
					isOpen={open}
					isDisabled={isDisabled}
					onPress={(): void => setOpen(true)}
				/>
			)}
			<Dialog title={label} isOpen={open} onOpenChange={setOpen} footer={false}>
				<MenuRows
					groups={groups}
					isDisabled={isDisabled}
					onSelect={(item): void => {
						setOpen(false);
						item.onSelect();
					}}
				/>
			</Dialog>
		</>
	);
};
