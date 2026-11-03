import type { ReactElement } from "react";
import { ActionMenu as FallbackActionMenu } from "./action-menu-fallback";
import { invokeMenuAction } from "./context-menu-policy";
import { NativeMenuView } from "./native-menu";
import { nativeMenuActions } from "./native-menu-actions";
import { NativeMenuTrigger } from "./native-menu-trigger";
import type { ActionMenuProps } from "./picker-props";

export const ActionMenu = (props: ActionMenuProps): ReactElement => {
	if (!NativeMenuView) return <FallbackActionMenu {...props} />;
	const trigger = <NativeMenuTrigger {...props} />;
	return props.isDisabled ? (
		trigger
	) : (
		<NativeMenuView
			title={props.label}
			actions={nativeMenuActions(props.groups)}
			onPressAction={({ nativeEvent }): void => {
				invokeMenuAction(props.groups, nativeEvent.event, props.isDisabled);
			}}
		>
			{trigger}
		</NativeMenuView>
	);
};
