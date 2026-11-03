import { Menu } from "@base-ui/react/menu";
import { Fragment, type ReactElement } from "react";
import { HoverSurface } from "./hover-surface.web";
import { Icon } from "./icon";
import type { MenuGroup } from "./picker-props";

export const MenuItems = ({
	groups,
	isDisabled,
}: {
	groups: readonly MenuGroup[];
	isDisabled?: boolean;
}): ReactElement => (
	<HoverSurface>
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
								onCheckedChange={(): void => {
									if (!isDisabled && !item.isDisabled) item.onSelect();
								}}
							>
								<Icon
									name={item.checked ? "checkboxChecked" : "stop"}
									size="sm"
								/>
								<span className="club-popup-item-label">{item.label}</span>
							</Menu.CheckboxItem>
						) : (
							<Menu.Item
								key={item.id}
								label={item.label}
								disabled={isDisabled || item.isDisabled}
								className="club-popup-item"
								data-tone={item.tone}
								onClick={(): void => {
									if (!isDisabled && !item.isDisabled) item.onSelect();
								}}
							>
								{item.icon ? (
									<Icon name={item.icon} tone="secondary" />
								) : undefined}
								<span className="club-popup-item-label">{item.label}</span>
							</Menu.Item>
						),
					)}
				</Menu.Group>
			</Fragment>
		))}
	</HoverSurface>
);
