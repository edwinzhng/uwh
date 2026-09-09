import DateTimePicker, {
	DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useAtomValue } from "jotai";
import { type ReactElement, useState } from "react";
import { Platform } from "react-native";
import { Button } from "./button";
import {
	dateFromValue,
	dateToValue,
	isDateAllowed,
	relativeDate,
} from "./date-time-values";
import { Dialog } from "./dialog";
import { PickerTrigger } from "./picker-trigger";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { themePreferenceAtom, useTheme } from "./theme";

type Props = {
	label: string;
	displayValue: string;
	value: Date;
	mode: "date" | "time";
	minimumDate?: Date;
	maximumDate?: Date;
	isDisabled?: boolean;
	canClear: boolean;
	onValueChange: (date: Date | undefined) => void;
};

export const NativeDateTimePicker = ({
	label,
	displayValue,
	value,
	mode,
	minimumDate,
	maximumDate,
	isDisabled,
	canClear,
	onValueChange,
}: Props): ReactElement => {
	const theme = useTheme();
	const appearance = useAtomValue(themePreferenceAtom);
	const [draft, setDraft] = useState<Date>();
	const [androidOpen, setAndroidOpen] = useState(false);
	const allowed = (date: Date): boolean =>
		isDateAllowed(
			dateToValue(date),
			minimumDate ? dateToValue(minimumDate) : undefined,
			maximumDate ? dateToValue(maximumDate) : undefined,
		);
	const initialValue =
		minimumDate && value < minimumDate
			? minimumDate
			: maximumDate && value > maximumDate
				? maximumDate
				: value;
	const choose = (next: Date | undefined): void => {
		if (isDisabled || (next && !allowed(next))) return;
		onValueChange(next);
		setDraft(undefined);
		setAndroidOpen(false);
	};
	const open = (): void => {
		if (isDisabled) return;
		if (Platform.OS === "android") {
			setAndroidOpen(true);
			DateTimePickerAndroid.open({
				value: initialValue,
				mode,
				minimumDate,
				maximumDate,
				onValueChange: (_, date): void => choose(date),
				onDismiss: (): void => setAndroidOpen(false),
				neutralButton: canClear ? { label: "Clear" } : undefined,
				onNeutralButtonPress: (): void => choose(undefined),
			});
		} else setDraft(initialValue);
	};
	return (
		<Stack gap="xs">
			<Text variant="caption" tone="secondary">
				{label}
			</Text>
			<PickerTrigger
				label={label}
				value={displayValue}
				icon={mode === "date" ? "calendar" : "clock"}
				isDisabled={isDisabled}
				isOpen={Boolean(draft) || androidOpen}
				onPress={open}
			/>
			{draft ? (
				<Dialog
					isOpen
					onOpenChange={(): void => setDraft(undefined)}
					title={label}
					footer={
						<Row>
							<Button
								label="Cancel"
								variant="ghost"
								onPress={(): void => setDraft(undefined)}
							/>
							<Button label="Apply" onPress={(): void => choose(draft)} />
						</Row>
					}
				>
					<DateTimePicker
						value={draft}
						mode={mode}
						display={mode === "date" ? "inline" : "spinner"}
						minimumDate={minimumDate}
						maximumDate={maximumDate}
						themeVariant={appearance}
						accentColor={theme.accent.background}
						textColor={theme.text.primary}
						onValueChange={(_, date): void => setDraft(date)}
					/>
					<Row wrap>
						{mode === "date"
							? [0, 1].map((offset) => {
									const date = dateFromValue(relativeDate(offset));
									return (
										<Button
											key={offset}
											label={offset ? "Tomorrow" : "Today"}
											variant="secondary"
											isDisabled={!date || !allowed(date)}
											onPress={(): void => {
												if (date) choose(date);
											}}
										/>
									);
								})
							: undefined}
						{canClear ? (
							<Button
								label="Clear"
								variant="ghost"
								onPress={(): void => choose(undefined)}
							/>
						) : undefined}
					</Row>
				</Dialog>
			) : undefined}
		</Stack>
	);
};
