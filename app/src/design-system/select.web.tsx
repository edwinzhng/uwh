import { Select as BaseSelect } from "@base-ui/react/select";
import type { ReactElement } from "react";
import { Icon } from "./icon";
import type { PickerProps } from "./picker-props";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const Select = <T extends string>({
	label,
	value,
	options,
	onValueChange,
	placeholder = "Select…",
	isDisabled,
	hideLabel = false,
	compact = false,
}: PickerProps<T>): ReactElement => {
	const container = usePopupContainer();
	const selected = options.find((option) => option.value === value);
	return (
		<BaseSelect.Root<T>
			value={value ?? null}
			items={options}
			onValueChange={(next): void => onValueChange(next ?? undefined)}
			disabled={isDisabled}
			modal={false}
		>
			<div className="club-picker-field">
				{!hideLabel ? (
					<BaseSelect.Label className="club-picker-label">
						{label}
					</BaseSelect.Label>
				) : undefined}
				<BaseSelect.Trigger
					className="club-picker-trigger"
					data-picker
					aria-label={hideLabel ? label : undefined}
					data-compact={compact || undefined}
					data-tone={selected?.tone}
				>
					<BaseSelect.Value
						className="club-picker-value"
						placeholder={placeholder}
					/>
					<BaseSelect.Icon>
						<Icon name="chevronDown" tone={selected?.tone ?? "secondary"} />
					</BaseSelect.Icon>
				</BaseSelect.Trigger>
			</div>
			<BaseSelect.Portal container={container}>
				<BaseSelect.Positioner
					className="club-popup-positioner"
					sideOffset={space.xxs}
					alignItemWithTrigger={false}
					collisionPadding={space.xs}
					align="start"
				>
					<BaseSelect.Popup className="club-popup" data-club-popup>
						<BaseSelect.List className="club-popup-list">
							{options.length === 0 ? (
								<div className="club-popup-empty">No options</div>
							) : (
								options.map((option) => (
									<BaseSelect.Item
										key={option.value}
										value={option.value}
										disabled={option.isDisabled}
										className="club-popup-item"
										data-tone={option.tone}
									>
										{option.icon ? (
											<Icon
												name={option.icon}
												tone={option.tone ?? "secondary"}
											/>
										) : undefined}
										<BaseSelect.ItemText className="club-popup-item-label">
											{option.label}
										</BaseSelect.ItemText>
										<BaseSelect.ItemIndicator className="club-popup-indicator">
											<Icon name="check" tone={option.tone ?? "primary"} />
										</BaseSelect.ItemIndicator>
									</BaseSelect.Item>
								))
							)}
						</BaseSelect.List>
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
};
