import { Menu } from "@base-ui/react/menu";
import { Fragment, type ReactElement } from "react";
import { Icon } from "./icon";
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
					<Icon name={icon} size="sm" tone="secondary" />
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
						{groups.map((group) => (
							<Fragment key={group.id}>
								{group !== groups.at(0) ? (
									<Menu.Separator className="club-popup-separator" />
								) : undefined}
								<Menu.Group>
									{group.label ? (
										<Menu.GroupLabel className="club-popup-group-label">
											{group.label}
										</Menu.GroupLabel>
									) : undefined}
									{group.items.map((item) =>
										item.checked !== undefined ? (
											<Menu.CheckboxItem
												key={item.id}
												checked={item.checked}
												disabled={isDisabled || item.isDisabled}
												className="club-popup-item"
												label={item.label}
												onCheckedChange={(): void => item.onSelect()}
											>
												<Icon
													name={item.checked ? "checkboxChecked" : "stop"}
													size="sm"
												/>
												<span className="club-popup-item-label">
													{item.label}
												</span>
											</Menu.CheckboxItem>
										) : (
											<Menu.Item
												key={item.id}
												label={item.label}
												disabled={item.isDisabled}
												className="club-popup-item"
												data-tone={item.tone}
												onClick={(): void => {
													if (!item.isDisabled) item.onSelect();
												}}
											>
												{item.icon ? (
													<Icon name={item.icon} tone="secondary" />
												) : undefined}
												<span className="club-popup-item-label">
													{item.label}
												</span>
											</Menu.Item>
										),
									)}
								</Menu.Group>
							</Fragment>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};
