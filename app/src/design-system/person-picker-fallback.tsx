import { type ReactElement, useState } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import type { PersonPickerProps } from "./person-picker-props";
import { ProfileOption } from "./profile-option";
import { ProfileTrigger } from "./profile-trigger";
import { Row } from "./row";
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
				<Stack gap="sm">
					<Stack gap="xs">
						{options.map((option) => (
							<ProfileOption
								key={option.id}
								name={option.name}
								personId={option.id}
								isSelected={option.id === value}
								onPress={(): void => {
									setOpen(false);
									onValueChange(option.id);
								}}
							/>
						))}
					</Stack>
					{account ? (
						<Row wrap gap="xs">
							{account.onProfile ? (
								<Button
									label="View profile"
									variant="secondary"
									compact
									prefix="user"
									onPress={(): void => {
										setOpen(false);
										account.onProfile?.();
									}}
								/>
							) : undefined}
							<Button
								label="Settings"
								variant="secondary"
								compact
								prefix="gear"
								onPress={(): void => {
									setOpen(false);
									account.onSettings();
								}}
							/>
							{account.onSignOut ? (
								<Button
									label="Sign out"
									variant="ghost"
									compact
									prefix="signOut"
									onPress={(): void => {
										setOpen(false);
										account.onSignOut?.();
									}}
								/>
							) : undefined}
						</Row>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
