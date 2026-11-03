import { type ReactElement, useState } from "react";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { matchesQuery } from "./matches-query";
import type { MultiSelectProps } from "./multi-select-props";
import { PersonChoice } from "./person-choice";
import { Row } from "./row";
import { Stack } from "./stack";

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
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	return (
		<Stack gap="xs">
			<Row wrap gap="xs">
				{options
					.filter((option) => values.includes(option.value))
					.map((option) => (
						<Button
							key={option.value}
							label={`${option.label} ×`}
							accessibilityLabel={`Remove ${option.label}`}
							leading={
								option.person ? (
									<Avatar
										name={option.person.name ?? option.label}
										personId={option.person.id}
										mini
									/>
								) : undefined
							}
							variant="secondary"
							compact
							isDisabled={isDisabled || isBusy}
							onPress={(): void => onToggle(option.value, false)}
						/>
					))}
			</Row>
			<Button
				label={placeholder}
				accessibilityLabel={label}
				prefix="plus"
				variant="secondary"
				isDisabled={isDisabled || isBusy}
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title={label}
				isOpen={open}
				isDismissDisabled={isBusy}
				onOpenChange={setOpen}
				footer={
					<Button
						label="Done"
						isDisabled={isBusy}
						onPress={(): void => setOpen(false)}
					/>
				}
			>
				<Field label="Search" value={search} onValueChange={setSearch} />
				<Stack gap="none">
					{options
						.filter((option) => matchesQuery(option.label, search))
						.map((option) => (
							<PersonChoice
								key={option.value}
								name={option.label}
								personId={option.person?.id}
								checked={values.includes(option.value)}
								isDisabled={
									isBusy ||
									isDisabled ||
									option.isDisabled ||
									(!values.includes(option.value) &&
										values.length >= maxSelections)
								}
								onChange={(checked): void => onToggle(option.value, checked)}
							/>
						))}
				</Stack>
			</Dialog>
		</Stack>
	);
};
