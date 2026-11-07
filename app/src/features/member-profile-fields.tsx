import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Field, Select, Stack, Text } from "../design-system";
import { fitnessDivision } from "../domain/fitness-division";
import type { MemberProfileInput } from "../domain/member-profile";
import type { PositionPreference } from "../domain/position-preferences";
import { MemberPositionPreferences } from "./member-position-preferences";
import { useSeason } from "./use-season";

export const MemberProfileFields = ({
	input,
	onChange,
	isDisabled,
	onPreferencesChange,
}: {
	input: MemberProfileInput;
	onChange: (
		field:
			| "name"
			| "capNumber"
			| "email"
			| "phone"
			| "birthDate"
			| "competitionGender",
		value: string,
	) => void;
	isDisabled: boolean;
	onPreferencesChange: (values: PositionPreference[]) => void;
}): ReactElement => {
	const { data } = useApp();
	const [seasonId] = useSeason();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const division = season
		? fitnessDivision(
				input.birthDate,
				input.competitionGender || undefined,
				season.start,
			)
		: undefined;
	return (
		<Stack>
			<Field
				label="Name"
				value={input.name}
				onValueChange={(value): void => onChange("name", value)}
				maxLength={80}
				isDisabled={isDisabled}
			/>
			<MemberPositionPreferences
				values={input.positionPreferences ?? []}
				onChange={onPreferencesChange}
				isDisabled={isDisabled}
			/>
			<Field
				label="Date of birth (private)"
				hint="YYYY-MM-DD · used to calculate your division"
				value={input.birthDate ?? ""}
				onValueChange={(value): void => onChange("birthDate", value)}
				maxLength={10}
				isDisabled={isDisabled}
			/>
			<Select
				label="Gender for division"
				value={input.competitionGender ?? ""}
				options={[
					{ value: "", label: "Not set" },
					{ value: "male", label: "Men" },
					{ value: "female", label: "Women" },
					{ value: "other", label: "Other" },
				]}
				onValueChange={(value): void =>
					onChange("competitionGender", value ?? "")
				}
				isDisabled={isDisabled}
			/>
			<Stack gap="xxs">
				<Text variant="small" weight="semibold">
					Division
				</Text>
				<Text variant="caption" tone="secondary">
					{season
						? `Age on December 31, ${season.start.slice(0, 4)}`
						: "Based on age at the end of the season's starting year."}
				</Text>
				<Text variant="small" tone="secondary">
					{division ??
						"No matching division. Check your date of birth and gender."}
				</Text>
			</Stack>
			<Field
				label="Phone (private)"
				inputMode="tel"
				value={input.phone}
				onValueChange={(value): void => onChange("phone", value)}
				maxLength={32}
				isDisabled={isDisabled}
			/>
		</Stack>
	);
};
