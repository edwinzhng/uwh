import { Select as BaseSelect } from "@base-ui/react/select";
import type { ReactElement } from "react";
import { HoverSurface } from "./hover-surface.web";
import { Icon } from "./icon";
import { NativePicker } from "./native-picker";
import type { PickerProps } from "./picker-props";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const Select = <T extends string>({
	appearance = "field",
	label,
	value,
	options,
	listFooter,
	onValueChange,
	placeholder = "Select…",
	isDisabled,
	hideLabel = false,
	compact = false,
}: PickerProps<T>): ReactElement => {
	const container = usePopupContainer();
	const selected = options.find((option) => option.value === value);
	if (listFooter)
		return (
			<NativePicker
				label={label}
				value={value}
				options={options}
				onValueChange={onValueChange}
				placeholder={placeholder}
				isDisabled={isDisabled}
				listFooter={listFooter}
			/>
		);
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
					data-appearance={appearance}
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
						<HoverSurface>
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
						</HoverSurface>
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
};
