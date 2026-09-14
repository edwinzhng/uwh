import { Autocomplete } from "@base-ui/react/autocomplete";
import { type ReactElement, useId, useState } from "react";
import type { TimeSelectorProps } from "./date-time-props";
import { formatTime, parseTime, timeSuggestions } from "./date-time-values";
import { Icon } from "./icon";
import { matchesQuery } from "./matches-query";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const TimeSelector = ({
	label,
	value,
	onValueChange,
	isDisabled,
}: TimeSelectorProps): ReactElement => {
	const id = useId();
	const container = usePopupContainer();
	const [draft, setDraft] = useState<string>();
	const [error, setError] = useState<string>();
	const [open, setOpen] = useState(false);
	const text = draft ?? formatTime(value);
	const parsed = parseTime(text);
	const suggestions =
		parsed && !timeSuggestions.some((item) => item.value === parsed)
			? [{ value: parsed, label: formatTime(parsed) }, ...timeSuggestions]
			: timeSuggestions;
	const commit = (input: string): void => {
		if (isDisabled) return;
		const next = parseTime(input);
		if (input.trim() && !next) {
			setError("Use a time like 6:30 PM or 18:30");
			return;
		}
		onValueChange(next);
		setDraft(undefined);
		setError(undefined);
	};
	return (
		<Autocomplete.Root
			items={suggestions}
			value={text}
			disabled={isDisabled}
			open={open}
			openOnInputClick
			onOpenChange={setOpen}
			onValueChange={(next, details): void => {
				setDraft(next);
				setError(undefined);
				if (details.reason === "item-press" || details.reason === "clear-press")
					commit(next);
			}}
			filter={(item, query): boolean =>
				draft === undefined ||
				item.value === parseTime(query) ||
				matchesQuery(item.label, query) ||
				matchesQuery(item.value, query)
			}
		>
			<div className="club-picker-field">
				<label htmlFor={id} className="club-picker-label">
					{label}
				</label>
				<Autocomplete.InputGroup
					className="club-combo"
					data-invalid={Boolean(error) || undefined}
				>
					<Icon name="clock" size="sm" tone="secondary" />
					<Autocomplete.Input
						id={id}
						className="club-combo-input"
						placeholder="6:30 PM"
						aria-invalid={Boolean(error)}
						aria-describedby={error ? `${id}-error` : undefined}
						onFocus={(event): void => event.currentTarget.select()}
						onBlur={(): void => commit(text)}
						onKeyDown={(event): void => {
							if (
								event.key === "Enter" &&
								!event.currentTarget.getAttribute("aria-activedescendant")
							) {
								event.preventDefault();
								commit(text);
								if (parseTime(text) || !text.trim()) setOpen(false);
							}
							if (event.key === "Escape") {
								setDraft(undefined);
								setError(undefined);
							}
						}}
					/>
					<div className="club-combo-actions">
						{text ? (
							<Autocomplete.Clear
								className="club-combo-action"
								aria-label={`Clear ${label.toLowerCase()}`}
							>
								<Icon name="close" size="sm" tone="secondary" />
							</Autocomplete.Clear>
						) : undefined}
						<Autocomplete.Trigger
							className="club-combo-action"
							aria-label={`Show ${label.toLowerCase()}`}
						>
							<Icon name="chevronDown" size="sm" tone="secondary" />
						</Autocomplete.Trigger>
					</div>
				</Autocomplete.InputGroup>
				{error ? (
					<span id={`${id}-error`} className="club-picker-error" role="alert">
						{error}
					</span>
				) : undefined}
			</div>
			<Autocomplete.Portal container={container}>
				<Autocomplete.Positioner
					className="club-popup-positioner"
					align="start"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
				>
					<Autocomplete.Popup className="club-popup" data-club-popup>
						<Autocomplete.Empty className="club-popup-empty">
							Try 6:30 PM or 18:30
						</Autocomplete.Empty>
						<Autocomplete.List
							className="club-popup-list"
							ref={(element): void => {
								if (draft === undefined)
									element
										?.querySelector("[data-current]")
										?.scrollIntoView({ block: "nearest" });
							}}
						>
							{(item: { value: string; label: string }): ReactElement => (
								<Autocomplete.Item
									key={item.value}
									value={item}
									className="club-popup-item"
									data-current={item.value === value || undefined}
								>
									<span className="club-popup-item-label">{item.label}</span>
									{item.value === value ? (
										<Icon name="check" size="sm" />
									) : undefined}
								</Autocomplete.Item>
							)}
						</Autocomplete.List>
					</Autocomplete.Popup>
				</Autocomplete.Positioner>
			</Autocomplete.Portal>
		</Autocomplete.Root>
	);
};
