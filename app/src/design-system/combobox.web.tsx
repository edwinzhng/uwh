import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { type ReactElement, useId } from "react";
import { Icon } from "./icon";
import { matchesQuery } from "./matches-query";
import type { ChoiceOption, PickerProps } from "./picker-props";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const Combobox = <T extends string>({
	label,
	value,
	options,
	onValueChange,
	placeholder = "Search…",
	isDisabled,
}: PickerProps<T>): ReactElement => {
	const id = useId();
	const container = usePopupContainer();
	const selected = options.find((option) => option.value === value);
	return (
		<BaseCombobox.Root<ChoiceOption<T>>
			items={options}
			value={selected ?? null}
			onValueChange={(option): void => onValueChange(option?.value)}
			isItemEqualToValue={(item, current): boolean =>
				item.value === current.value
			}
			filter={(option, query): boolean => matchesQuery(option.label, query)}
			disabled={isDisabled}
			autoHighlight
		>
			<div className="club-picker-field">
				<label htmlFor={id} className="club-picker-label">
					{label}
				</label>
				<BaseCombobox.InputGroup className="club-combo">
					<Icon name="search" tone="secondary" />
					<BaseCombobox.Input
						id={id}
						placeholder={placeholder}
						className="club-combo-input"
					/>
					<div className="club-combo-actions">
						{selected ? (
							<BaseCombobox.Clear
								className="club-combo-action"
								aria-label={`Clear ${label.toLowerCase()}`}
							>
								<Icon name="close" tone="secondary" />
							</BaseCombobox.Clear>
						) : undefined}
						<BaseCombobox.Trigger
							className="club-combo-action"
							aria-label={`Show ${label.toLowerCase()}`}
						>
							<Icon name="chevronDown" tone="secondary" />
						</BaseCombobox.Trigger>
					</div>
				</BaseCombobox.InputGroup>
			</div>
			<BaseCombobox.Portal container={container}>
				<BaseCombobox.Positioner
					className="club-popup-positioner"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
					align="start"
				>
					<BaseCombobox.Popup className="club-popup" data-club-popup>
						<BaseCombobox.Empty className="club-popup-empty">
							No results
						</BaseCombobox.Empty>
						<BaseCombobox.List className="club-popup-list">
							{(option: ChoiceOption<T>): ReactElement => (
								<BaseCombobox.Item
									key={option.value}
									value={option}
									disabled={option.isDisabled}
									className="club-popup-item"
								>
									{option.icon ? (
										<Icon name={option.icon} tone="secondary" />
									) : undefined}
									<span className="club-popup-item-label">{option.label}</span>
									<BaseCombobox.ItemIndicator className="club-popup-indicator">
										<Icon name="check" />
									</BaseCombobox.ItemIndicator>
								</BaseCombobox.Item>
							)}
						</BaseCombobox.List>
					</BaseCombobox.Popup>
				</BaseCombobox.Positioner>
			</BaseCombobox.Portal>
		</BaseCombobox.Root>
	);
};
