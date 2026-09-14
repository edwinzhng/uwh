import { Menu } from "@base-ui/react/menu";
import type { ReactElement } from "react";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { PersonPickerContent } from "./person-picker-content";
import type { PersonPickerProps } from "./person-picker-props";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const PersonPicker = ({
	value,
	options,
	onValueChange,
	account,
}: PersonPickerProps): ReactElement | undefined => {
	const person = options.find((option) => option.id === value);
	const container = usePopupContainer();
	const canSwitch = options.length > 1;
	if (!person || (!canSwitch && !account)) return undefined;
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				className="club-person-trigger"
				aria-label={`${canSwitch ? "Switch profile" : "Account menu"}. Current profile: ${person.name}`}
			>
				<PersonPickerContent person={person} canSwitch={canSwitch} />
			</Menu.Trigger>
			<Menu.Portal container={container}>
				<Menu.Positioner
					className="club-popup-positioner"
					sideOffset={space.xs}
					collisionPadding={space.xs}
					align="end"
				>
					<Menu.Popup className="club-popup club-menu-popup" data-club-popup>
						{canSwitch ? (
							<Menu.RadioGroup
								value={value}
								onValueChange={onValueChange}
								aria-label="Switch profile"
							>
								{(["You", "Child"] as const)
									.filter((relationship) =>
										options.some(
											(option) => option.relationship === relationship,
										),
									)
									.map((relationship) => (
										<Menu.Group key={relationship}>
											<Menu.GroupLabel className="club-popup-group-label">
												{relationship === "You" ? "Your profile" : "Children"}
											</Menu.GroupLabel>
											{options
												.filter(
													(option) => option.relationship === relationship,
												)
												.map((option) => (
													<Menu.RadioItem
														key={option.id}
														value={option.id}
														label={option.name}
														className="club-popup-item club-person-option"
													>
														<Avatar name={option.name} />
														<span className="club-popup-item-label">
															{option.name}
														</span>
														<Menu.RadioItemIndicator className="club-popup-indicator">
															<Icon name="check" size="sm" />
														</Menu.RadioItemIndicator>
													</Menu.RadioItem>
												))}
										</Menu.Group>
									))}
							</Menu.RadioGroup>
						) : undefined}
						{account ? (
							<>
								{canSwitch ? (
									<Menu.Separator className="club-popup-separator" />
								) : undefined}
								<Menu.Group>
									<Menu.Item
										label="Settings"
										className="club-popup-item"
										onClick={account.onSettings}
									>
										<Icon name="gear" size="sm" tone="secondary" />
										<span className="club-popup-item-label">Settings</span>
									</Menu.Item>
									{account.onSignOut ? (
										<Menu.Item
											label="Sign out"
											className="club-popup-item"
											onClick={account.onSignOut}
										>
											<Icon name="signOut" size="sm" tone="secondary" />
											<span className="club-popup-item-label">Sign out</span>
										</Menu.Item>
									) : undefined}
								</Menu.Group>
							</>
						) : undefined}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};
