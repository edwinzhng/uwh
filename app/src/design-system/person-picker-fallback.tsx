import { type ReactElement, useState } from "react";
import { Dialog } from "./dialog";
import type { PersonPickerProps } from "./person-picker-props";
import { PopupRow } from "./popup-row";
import { ProfileOption } from "./profile-option";
import { ProfileTrigger } from "./profile-trigger";
import { Stack } from "./stack";

export const PersonPicker = ({
	value,
	options,
	onValueChange,
	account,
}: PersonPickerProps): ReactElement | undefined => {
	const [open, setOpen] = useState(false);
	const person = options.find((option) => option.id === value);
	const canSwitch = options.length > 1;
	if (!person || (!canSwitch && !account)) return undefined;
	return (
		<>
			<ProfileTrigger
				personId={person.id}
				name={person.name}
				label={`Account. Current profile: ${person.name}`}
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Profiles"
				isOpen={open}
				onOpenChange={setOpen}
				footer={false}
			>
				<Stack gap="lg">
					<Stack gap="xs">
						{options.map((option) => (
							<ProfileOption
								key={option.id}
								name={option.name}
								personId={option.id}
								description={
									option.id === value
										? "Current profile"
										: option.relationship === "You"
											? "You"
											: "Family"
								}
								isSelected={option.id === value}
								onPress={(): void => {
									setOpen(false);
									onValueChange(option.id);
								}}
							/>
						))}
					</Stack>
					{account ? (
						<>
							{account.onProfile ? (
								<PopupRow
									label="View profile"
									icon="users"
									onSelect={(): void => {
										setOpen(false);
										account.onProfile?.();
									}}
								/>
							) : undefined}
							<PopupRow
								label="Settings"
								icon="gear"
								onSelect={(): void => {
									setOpen(false);
									account.onSettings();
								}}
							/>
							{account.onSignOut ? (
								<PopupRow
									label="Sign out"
									icon="signOut"
									onSelect={(): void => {
										setOpen(false);
										account.onSignOut?.();
									}}
								/>
							) : undefined}
						</>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
