import { type ReactElement, useState } from "react";
import { Select, Stack, Surface } from "../design-system";
import type { PersonalFitnessRow } from "../domain/personal-fitness";
import { PersonalFitnessDetail } from "./personal-fitness-detail";

export const PersonalFitnessCards = ({
	rows,
	personId,
}: {
	rows: PersonalFitnessRow[];
	personId: string;
}): ReactElement => {
	const [selectedId, setSelectedId] = useState<string>();
	const selected =
		rows.find((row) => row.test._id === selectedId) ?? rows.at(0);
	return (
		<Stack gap="md">
			<Select
				label="Fitness test"
				value={selected?.test._id}
				options={rows.map((row) => ({
					value: row.test._id,
					label: row.test.name,
				}))}
				onValueChange={setSelectedId}
			/>
			{selected ? (
				<Surface>
					<PersonalFitnessDetail
						key={selected.test._id}
						row={selected}
						personId={personId}
					/>
				</Surface>
			) : undefined}
		</Stack>
	);
};
