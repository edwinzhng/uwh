import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { MenuAvatar } from "./menu-avatar";
import { MenuRows } from "./menu-rows";
import type { ActionMenuProps } from "./picker-props";
import { PickerTrigger } from "./picker-trigger";
import { PoolAddButton } from "./pool-add-button";
import { geometry } from "./tokens";

export const ActionMenu = ({
	label,
	add,
	avatar,
	avatarDiameter,
	accessibilityLabel,
	compact,
	icon,
	groups,
	isDisabled,
}: ActionMenuProps): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			{avatar ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={accessibilityLabel ?? label}
					disabled={isDisabled}
					onPress={(): void => setOpen(true)}
					style={{
						width: avatarDiameter ?? geometry.touch,
						height: avatarDiameter ?? geometry.touch,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<MenuAvatar person={avatar} diameter={avatarDiameter} />
				</Pressable>
			) : add ? (
				<PoolAddButton
					label={accessibilityLabel ?? label}
					onPress={isDisabled ? undefined : (): void => setOpen(true)}
				/>
			) : icon ? (
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
