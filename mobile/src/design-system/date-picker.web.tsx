import { Popover } from "@base-ui/react/popover";
import { type ReactElement, useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DatePickerProps } from "./date-time-props";
import {
	dateFromValue,
	dateToValue,
	formatDate,
	isDateAllowed,
	parseDate,
	relativeDate,
} from "./date-time-values";
import { Icon } from "./icon";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

export const DatePicker = ({
	label,
	value,
	onValueChange,
	min,
	max,
	isDisabled,
}: DatePickerProps): ReactElement => {
	const id = useId();
	const container = usePopupContainer();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string>();
	const [month, setMonth] = useState<Date>();
	const selected = dateFromValue(value);
	const minimum = dateFromValue(min);
	const maximum = dateFromValue(max);
	const choose = (next: string | undefined): void => {
		if (isDisabled || (next && !isDateAllowed(next, min, max))) return;
		onValueChange(next);
		setOpen(false);
	};
	return (
		<Popover.Root
			open={open}
			onOpenChange={(next): void => {
				if (next) {
					setDraft(value ?? "");
					setError(undefined);
					setMonth(selected ?? minimum ?? new Date());
				}
				setOpen(next);
			}}
		>
			<div className="club-picker-field">
				<span id={`${id}-label`} className="club-picker-label">
					{label}
				</span>
				<Popover.Trigger
					className="club-picker-trigger"
					data-picker
					disabled={isDisabled}
					aria-labelledby={`${id}-label ${id}-value`}
				>
					<span id={`${id}-value`} className="club-picker-value">
						{formatDate(value)}
					</span>
					<Icon name="calendar" size="sm" tone="secondary" />
				</Popover.Trigger>
			</div>
			<Popover.Portal container={container}>
				<Popover.Positioner
					className="club-popup-positioner"
					align="start"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
				>
					<Popover.Popup
						className="club-popup club-date-popup"
						data-club-popup
						aria-label={`Choose ${label.toLowerCase()}`}
					>
						<form
							className="club-date-entry"
							onSubmit={(event): void => {
								event.preventDefault();
								const next = parseDate(draft);
								if (!next) setError("Use YYYY-MM-DD, today or tomorrow");
								else if (!isDateAllowed(next, min, max))
									setError(
										min && max
											? `Choose ${min} to ${max}`
											: min
												? `Choose ${min} or later`
												: `Choose ${max} or earlier`,
									);
								else choose(next);
							}}
						>
							<div className="club-combo">
								<input
									className="club-combo-input"
									aria-label="Enter date"
									aria-invalid={Boolean(error)}
									aria-describedby={error ? `${id}-error` : undefined}
									placeholder="YYYY-MM-DD"
									value={draft}
									autoComplete="off"
									onChange={(event): void => {
										setDraft(event.target.value);
										setError(undefined);
									}}
								/>
								<div className="club-combo-actions">
									<button
										type="submit"
										className="club-combo-action"
										aria-label="Apply date"
									>
										<Icon name="arrowRight" size="sm" />
									</button>
								</div>
							</div>
							{error ? (
								<span
									id={`${id}-error`}
									className="club-picker-error"
									role="alert"
								>
									{error}
								</span>
							) : undefined}
						</form>
						<DayPicker
							className="club-calendar"
							mode="single"
							required
							selected={selected}
							month={month}
							onMonthChange={setMonth}
							onSelect={(date): void => choose(dateToValue(date))}
							startMonth={minimum}
							endMonth={maximum}
							disabled={[
								...(minimum ? [{ before: minimum }] : []),
								...(maximum ? [{ after: maximum }] : []),
							]}
							showOutsideDays
							fixedWeeks
							navLayout="after"
						/>
						<div className="club-date-shortcuts">
							{[
								{ label: "Today", value: relativeDate(0) },
								{ label: "Tomorrow", value: relativeDate(1) },
							].map((shortcut) => (
								<button
									key={shortcut.label}
									type="button"
									className="club-calendar-shortcut"
									disabled={!isDateAllowed(shortcut.value, min, max)}
									onClick={(): void => choose(shortcut.value)}
								>
									{shortcut.label}
								</button>
							))}
							{value ? (
								<button
									type="button"
									className="club-calendar-shortcut"
									onClick={(): void => choose(undefined)}
								>
									Clear
								</button>
							) : undefined}
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};
