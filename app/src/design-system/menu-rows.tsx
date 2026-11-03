import { Fragment, type ReactElement } from "react";
import { Divider } from "./divider";
import type { MenuAction, MenuGroup } from "./picker-props";
import { PopupRow } from "./popup-row";
import { Stack } from "./stack";
import { Text } from "./text";

export const MenuRows = ({
	groups,
	isDisabled,
	onSelect,
}: {
	groups: readonly MenuGroup[];
	isDisabled?: boolean;
	onSelect: (item: MenuAction) => void;
}): ReactElement => (
	<Stack gap="xs">
		{groups.map((group) => (
			<Fragment key={group.id}>
				{group !== groups.at(0) ? <Divider /> : undefined}
				{group.label ? (
					<Text variant="caption" tone="secondary">
						{group.label}
					</Text>
				) : undefined}
				{group.items.map((item) => (
					<PopupRow
						key={item.id}
						label={item.label}
						icon={item.icon}
						tone={item.tone}
						isChecked={item.checked}
						isDisabled={isDisabled || item.isDisabled}
						onSelect={(): void => {
							if (!isDisabled && !item.isDisabled) onSelect(item);
						}}
					/>
				))}
			</Fragment>
		))}
	</Stack>
);
