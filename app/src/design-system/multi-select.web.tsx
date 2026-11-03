import { Combobox } from "@base-ui/react/combobox";
import { type ReactElement, useId, useState } from "react";
import { Avatar } from "./avatar";
import { HoverSurface } from "./hover-surface.web";
import { Icon } from "./icon";
import { matchesQuery } from "./matches-query";
import type { MultiSelectProps } from "./multi-select-props";
import type { ChoiceOption } from "./picker-props";
import { usePopupContainer } from "./popup-container";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MultiSelect = <T extends string>({
	label,
	values,
	options,
	onToggle,
	isDisabled,
	isBusy,
	maxSelections = Number.POSITIVE_INFINITY,
	placeholder = "Choose…",
}: MultiSelectProps<T>): ReactElement => {
	const id = useId();
	const [search, setSearch] = useState("");
	const container = usePopupContainer();
	const theme = useTheme();
	const selected = options.filter((option) => values.includes(option.value));
	return (
		<Combobox.Root<ChoiceOption<T>, true>
			multiple
			inputValue={search}
			onInputValueChange={setSearch}
			onOpenChange={(open, details): void => {
				if (!open && details.reason === "item-press") details.cancel();
			}}
			items={options}
			value={selected}
			disabled={isDisabled}
			autoHighlight
			isItemEqualToValue={(a, b): boolean => a.value === b.value}
			filter={(option, query): boolean => matchesQuery(option.label, query)}
			onValueChange={(next, details): void => {
				if (isBusy) {
					details.cancel();
					return;
				}
				const added = next.find((option) => !values.includes(option.value));
				const removed = selected.find(
					(option) => !next.some((entry) => entry.value === option.value),
				);
				if (added && values.length < maxSelections) onToggle(added.value, true);
				else if (removed) onToggle(removed.value, false);
				setSearch("");
			}}
		>
			<div className="club-picker-field">
				<label htmlFor={id} className="club-picker-label">
					{label}
				</label>
				<Combobox.InputGroup
					className="club-combo"
					style={{ width: "100%", flexWrap: "wrap", gap: space.xs }}
				>
					<Combobox.Chips
						style={{
							display: "flex",
							flex: 1,
							minWidth: 0,
							flexWrap: "wrap",
							alignItems: "center",
							gap: space.xs,
						}}
					>
						{selected.map((option) => (
							<Combobox.Chip
								key={option.value}
								style={{
									display: "flex",
									alignItems: "center",
									gap: space.xxs,
									borderRadius: corners.pill,
									background: theme.background.selected,
									paddingInlineStart: space.xxs,
									maxWidth: "100%",
								}}
							>
								{option.person ? (
									<Avatar
										name={option.person.name ?? option.label}
										personId={option.person.id}
										mini
									/>
								) : undefined}
								<span
									style={{
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{option.label}
								</span>
								<Combobox.ChipRemove
									disabled={isBusy}
									aria-label={`Remove ${option.label}`}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										border: 0,
										background: "transparent",
										color: "inherit",
										width: geometry.touch,
										height: geometry.touch,
										borderRadius: corners.pill,
										cursor: "pointer",
									}}
								>
									<Icon name="close" size="sm" />
								</Combobox.ChipRemove>
							</Combobox.Chip>
						))}
						<Combobox.Input
							id={id}
							placeholder={placeholder}
							className="club-combo-input"
							style={{
								flex: 1,
								minWidth: geometry.touch * 2,
								minHeight: geometry.touch,
								width: "auto",
							}}
						/>
					</Combobox.Chips>
					<Combobox.Trigger
						className="club-combo-action"
						aria-label={`Show ${label.toLowerCase()}`}
					>
						<Icon name="chevronDown" tone="secondary" />
					</Combobox.Trigger>
				</Combobox.InputGroup>
			</div>
			<Combobox.Portal container={container}>
				<Combobox.Positioner
					className="club-popup-positioner"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
					align="start"
				>
					<Combobox.Popup className="club-popup" data-club-popup>
						<HoverSurface>
							<Combobox.Empty className="club-popup-empty">
								No matches
							</Combobox.Empty>
							<Combobox.List className="club-popup-list">
								{(option: ChoiceOption<T>): ReactElement => (
									<Combobox.Item
										key={option.value}
										value={option}
										disabled={
											isBusy ||
											option.isDisabled ||
											(!values.includes(option.value) &&
												values.length >= maxSelections)
										}
										className="club-popup-item"
									>
										{option.person ? (
											<Avatar
												name={option.person.name ?? option.label}
												personId={option.person.id}
												compact
											/>
										) : undefined}
										<span className="club-popup-item-label">
											{option.label}
										</span>
										<Combobox.ItemIndicator className="club-popup-indicator">
											<Icon name="check" />
										</Combobox.ItemIndicator>
									</Combobox.Item>
								)}
							</Combobox.List>
						</HoverSurface>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
};
