import type { ReactElement } from "react";
import { Select, Stack, Text } from "../design-system";
import {
	type PositionPreference,
	positionPreferenceOptions,
} from "../domain/position-preferences";

type Selection = PositionPreference | "none";
export const MemberPositionPreferences = ({
	values,
	onChange,
	isDisabled,
}: {
	values: PositionPreference[];
	onChange: (values: PositionPreference[]) => void;
	isDisabled: boolean;
}): ReactElement => (
	<Stack gap="xs">
		<Text variant="small" weight="semibold">
			Position preferences
		</Text>
		<Text variant="caption" tone="secondary">
			Choose your preferred positions in order. You can choose just one.
		</Text>
		{["First choice", "Choice 2", "Choice 3", "Choice 4", "Choice 5"]
			.slice(0, values.length + 1)
			.map((label, index) => (
				<Select<Selection>
					key={label}
					label={label}
					value={values.at(index) ?? "none"}
					options={[
						{ value: "none", label: "No preference" },
						...positionPreferenceOptions.map((option) => ({
							...option,
							isDisabled:
								values.includes(option.value) &&
								values.at(index) !== option.value,
						})),
					]}
					isDisabled={isDisabled}
					onValueChange={(value): void => {
						if (!value || value === "none")
							onChange(values.filter((_, current) => current !== index));
						else
							onChange(
								values
									.map((entry, current) => (current === index ? value : entry))
									.concat(index === values.length ? [value] : []),
							);
					}}
				/>
			))}
	</Stack>
);
