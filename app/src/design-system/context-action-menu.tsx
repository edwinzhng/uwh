import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable } from "react-native";
import { invokeMenuAction } from "./context-menu-policy";
import type { ContextActionMenuProps } from "./context-menu-props";
import { ContextMenuTrigger } from "./context-menu-trigger";
import { Dialog } from "./dialog";
import { MenuRows } from "./menu-rows";
import { NativeMenuView } from "./native-menu";
import { nativeMenuActions } from "./native-menu-actions";

export const ContextActionMenu = ({
	label,
	groups,
	isDisabled,
	children,
}: ContextActionMenuProps): ReactElement => {
	const [open, setOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const show = (): void => {
		if (!isDisabled) setOpen(true);
	};
	const surface = (content: ReactNode): ReactNode =>
		NativeMenuView && !isDisabled ? (
			<NativeMenuView
				style={{ maxWidth: "100%", minWidth: 0, flexShrink: 1 }}
				shouldOpenOnLongPress
				title={label}
				actions={nativeMenuActions(groups, isDisabled)}
				onPressAction={({ nativeEvent }): void => {
					invokeMenuAction(groups, nativeEvent.event, isDisabled);
				}}
			>
				{content}
			</NativeMenuView>
		) : (
			<Pressable
				accessible={false}
				onLongPress={show}
				disabled={isDisabled}
				style={{ maxWidth: "100%", minWidth: 0, flexShrink: 1 }}
			>
				{content}
			</Pressable>
		);
	return (
		<>
			{children({
				open: show,
				triggerFocused: focused,
				surface,
				trigger: (
					<ContextMenuTrigger
						label={label}
						isOpen={open}
						isFocused={focused}
						isDisabled={isDisabled}
						onOpen={show}
						onFocusChange={setFocused}
					/>
				),
			})}
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
