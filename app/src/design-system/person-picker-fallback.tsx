import { type ReactElement, useRef, useState } from "react";
import { Dialog } from "./dialog";
import { Divider } from "./divider";
import { Icon } from "./icon";
import { List } from "./list";
import { ListItem } from "./list-item";
import type { PersonPickerProps } from "./person-picker-props";
import { ProfileOption } from "./profile-option";
import { ProfileTrigger } from "./profile-trigger";
import { Stack } from "./stack";
import { Text } from "./text";

export const PersonPicker = ({
	value,
	options,
	onValueChange,
	account,
	views,
}: PersonPickerProps): ReactElement | undefined => {
	const [open, setOpen] = useState(false);
	const pending = useRef<(() => void) | undefined>(undefined);
	const closeAndRun = (action: () => void): void => {
		pending.current = action;
		setOpen(false);
	};
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
				onOpenChange={(next): void => {
					if (next) pending.current = undefined;
					setOpen(next);
				}}
				onAfterClose={(): void => {
					const action = pending.current;
					pending.current = undefined;
					action?.();
				}}
				footer={false}
			>
				<Stack gap="sm">
					<Stack gap="xs">
						<Text variant="caption" tone="secondary">
							Acting as
						</Text>
						{options.map((option) => (
							<ProfileOption
								key={option.id}
								name={option.name}
								personId={option.id}
								isSelected={option.id === value}
								onPress={(): void => {
									closeAndRun((): void => onValueChange(option.id));
								}}
							/>
						))}
					</Stack>
					{views ? (
						<Stack gap="xs">
							<Text variant="caption" tone="secondary">
								View as
							</Text>
							{(
								[
									{ value: "personal", label: "Player", icon: "user" },
									{ value: "coaching", label: "Coach", icon: "users" },
								] as const
							).map((view) => (
								<ListItem
									key={view.value}
									title={view.label}
									leading={<Icon name={view.icon} />}
									trailing={
										views.value === view.value ? (
											<Icon name="check" />
										) : undefined
									}
									selected={views.value === view.value}
									showChevron={false}
									onPress={(): void =>
										closeAndRun((): void => views.onValueChange(view.value))
									}
								/>
							))}
						</Stack>
					) : undefined}
					{account ? (
						<Stack gap="sm">
							<Divider />
							<List separators="full">
								{account.onProfile ? (
									<ListItem
										title="View profile"
										icon="user"
										onPress={(): void => {
											if (account.onProfile) closeAndRun(account.onProfile);
										}}
									/>
								) : undefined}
								<ListItem
									title="Settings"
									icon="gear"
									onPress={(): void => closeAndRun(account.onSettings)}
								/>
								{account.onSignOut ? (
									<ListItem
										title="Sign out"
										icon="signOut"
										showChevron={false}
										onPress={(): void => {
											if (account.onSignOut) closeAndRun(account.onSignOut);
										}}
									/>
								) : undefined}
							</List>
						</Stack>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
