import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Dialog } from "./dialog";
import { Divider } from "./divider";
import { PersonPickerContent } from "./person-picker-content";
import type { PersonPickerProps } from "./person-picker-props";
import { PopupRow } from "./popup-row";
import { ProfileOption } from "./profile-option";
import { Stack } from "./stack";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const PersonPicker = ({
	value,
	options,
	onValueChange,
	account,
}: PersonPickerProps): ReactElement | undefined => {
	const [open, setOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const theme = useTheme();
	const person = options.find((option) => option.id === value);
	const canSwitch = options.length > 1;
	if (!person || (!canSwitch && !account)) return undefined;
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${canSwitch ? "Switch profile" : "Account menu"}. Current profile: ${person.name}`}
				accessibilityState={{ expanded: open }}
				onPress={(): void => setOpen(true)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					minHeight: geometry.touch,
					padding: space.xxs,
					borderRadius: corners.control,
					backgroundColor: pressed ? theme.background.hover : "transparent",
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
				})}
			>
				<PersonPickerContent person={person} canSwitch={canSwitch} />
			</Pressable>
			<Dialog
				title={canSwitch ? "Switch profile" : "Account"}
				isOpen={open}
				onOpenChange={setOpen}
				footer={false}
			>
				<Stack gap="xs">
					{canSwitch
						? options.map((option) => (
								<ProfileOption
									key={option.id}
									name={option.name}
									description={
										option.relationship === "You" ? "Your profile" : "Child"
									}
									isSelected={option.id === value}
									onPress={(): void => {
										onValueChange(option.id);
										setOpen(false);
									}}
								/>
							))
						: undefined}
					{account ? (
						<>
							{canSwitch ? <Divider /> : undefined}
							<PopupRow
								label="Settings"
								icon="gear"
								onSelect={(): void => {
									setOpen(false);
									account.onSettings();
								}}
							/>
						</>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
