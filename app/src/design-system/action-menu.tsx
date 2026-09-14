import { Fragment, type ReactElement, useState } from "react";
import { Dialog } from "./dialog";
import { Divider } from "./divider";
import { IconButton } from "./icon-button";
import type { ActionMenuProps } from "./picker-props";
import { PickerTrigger } from "./picker-trigger";
import { PopupRow } from "./popup-row";
import { Stack } from "./stack";
import { Text } from "./text";

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
					label={label}
					icon={icon}
					isDisabled={isDisabled}
					onPress={(): void => setOpen(true)}
				/>
			) : (
				<PickerTrigger
					label={accessibilityLabel ?? label}
					compact={compact}
					value={label}
					isOpen={open}
					isDisabled={isDisabled}
					onPress={(): void => setOpen(true)}
				/>
			)}
			<Dialog title={label} isOpen={open} onOpenChange={setOpen}>
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
									isDisabled={item.isDisabled}
									onSelect={(): void => {
										if (!item.isDisabled) {
											setOpen(false);
											item.onSelect();
										}
									}}
								/>
							))}
						</Fragment>
					))}
				</Stack>
			</Dialog>
		</>
	);
};
