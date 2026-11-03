import type { ReactElement } from "react";
import { Disclosure, Field, Grid, Select, Stack, Text } from "../design-system";
import {
	type FitnessSummary,
	type FitnessUnit,
	fitnessAverage,
	formatFitnessValue,
} from "../domain/fitness";
export type FitnessEntry = { personId: string; value: string; notes: string };
export const FitnessResultRow = ({
	name,
	unit,
	entry,
	onChange,
	stats,
	disabled,
	compact = false,
}: {
	name: string;
	unit: FitnessUnit;
	entry: FitnessEntry;
	onChange: (entry: FitnessEntry) => void;
	stats?: FitnessSummary;
	disabled: boolean;
	compact?: boolean;
}): ReactElement => (
	<Stack gap="sm">
		{!compact ? (
			<Stack gap="xxs">
				<Text variant="label">{name}</Text>
				{stats ? (
					<Text variant="caption" tone="secondary">
						{unit === "pass_fail"
							? fitnessAverage(unit, stats)
							: `Best ${formatFitnessValue(unit, stats.best)} · ${fitnessAverage(unit, stats)} average`}
					</Text>
				) : undefined}
			</Stack>
		) : undefined}
		<Grid>
			{unit === "pass_fail" ? (
				<Select
					label={compact ? "Result" : `${name} result`}
					value={entry.value}
					options={[
						{ value: "", label: "Not recorded" },
						{ value: "pass", label: "Passed" },
						{ value: "fail", label: "Not passed" },
					]}
					onValueChange={(value): void =>
						onChange({ ...entry, value: value ?? "" })
					}
					isDisabled={disabled}
				/>
			) : (
				<Field
					label={compact ? "Result" : `${name} result`}
					value={entry.value}
					onValueChange={(value): void => onChange({ ...entry, value })}
					placeholder={
						unit === "time" ? "m:ss" : unit === "distance" ? "Metres" : "Count"
					}
					inputMode={
						unit === "count"
							? "numeric"
							: unit === "distance"
								? "decimal"
								: "text"
					}
					isDisabled={disabled}
				/>
			)}
			<Disclosure
				title="Result notes"
				summary={entry.notes ? "Note added" : "Optional"}
				defaultOpen={Boolean(entry.notes)}
				isDisabled={disabled}
			>
				<Field
					label={compact ? "Notes (optional)" : `${name} notes`}
					value={entry.notes}
					onValueChange={(notes): void => onChange({ ...entry, notes })}
					maxLength={1000}
					isDisabled={disabled}
				/>
			</Disclosure>
		</Grid>
	</Stack>
);
