import { Menu } from "@base-ui/react/menu";
import type { ReactElement } from "react";
import { Icon } from "./icon";
import { MenuAvatar } from "./menu-avatar";
import { MenuItems } from "./menu-items.web";
import type { ActionMenuProps } from "./picker-props";
import { PoolAddGlyph } from "./pool-add-glyph";
import { usePopupContainer } from "./popup-container";
import { geometry, space } from "./tokens";

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
	const container = usePopupContainer();
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				className="club-picker-trigger"
				style={
					add || avatar
						? {
								width: avatarDiameter ?? geometry.touch,
								height: avatarDiameter ?? geometry.touch,
								minWidth: avatarDiameter ?? geometry.touch,
								padding: 0,
								border: 0,
								background: "transparent",
								display: "flex",
								flexDirection: "column",
								alignItems: avatar ? "center" : "flex-end",
								justifyContent: avatar ? "center" : "flex-start",
							}
						: undefined
				}
				disabled={isDisabled}
				aria-label={accessibilityLabel ?? label}
				data-compact={compact || undefined}
				data-icon={icon ? "" : undefined}
			>
				{avatar ? (
					<MenuAvatar person={avatar} diameter={avatarDiameter} />
				) : add ? (
					<PoolAddGlyph />
				) : icon ? (
					<Icon name={icon} size="md" tone="secondary" />
				) : (
					<>
						<span className="club-picker-value">{label}</span>
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
