import { Menu } from "@base-ui/react/menu";
import type { ReactElement } from "react";
import { Icon } from "./icon";
import { MenuItems } from "./menu-items.web";
import type { ActionMenuProps } from "./picker-props";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const ActionMenu = ({
	label,
	accessibilityLabel,
	compact,
	icon,
	groups,
	isDisabled,
}: ActionMenuProps): ReactElement => {
	const container = usePopupContainer();
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				className="club-picker-trigger"
				disabled={isDisabled}
				aria-label={accessibilityLabel ?? label}
				data-compact={compact || undefined}
				data-icon={icon ? "" : undefined}
			>
				{icon ? (
					<Icon name={icon} size="md" tone="secondary" />
				) : (
					<>
						{label}
						<Icon name="chevronDown" tone="secondary" />
					</>
				)}
			</Menu.Trigger>
			<Menu.Portal container={container}>
				<Menu.Positioner
					className="club-popup-positioner"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
					align="start"
				>
					<Menu.Popup className="club-popup club-menu-popup" data-club-popup>
						<MenuItems groups={groups} isDisabled={isDisabled} />
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};
