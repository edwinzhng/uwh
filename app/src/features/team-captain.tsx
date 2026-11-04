import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Select, Text } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { LineupSide } from "../domain/lineup";

export const TeamCaptain = ({
	side,
	people,
	personId,
	onChange,
}: {
	side: LineupSide;
	people: string[];
	personId?: string;
	onChange?: (personId?: string) => void;
}): ReactElement | undefined => {
	const { data } = useApp();
	return onChange ? (
		<Select
			hideLabel
			compact
			label={`${side === "black" ? "Black" : "White"} captain`}
			value={personId ?? "none"}
			options={[
				{ value: "none", label: "Set captain" },
				...people.map((id) => ({
					value: id,
					label: memberName(data, id),
					person: { id, name: memberName(data, id) },
				})),
			]}
			onValueChange={(id): void => {
				if (id) onChange(id === "none" ? undefined : id);
			}}
		/>
	) : personId ? (
		<Text variant="caption">Captain · {memberName(data, personId)}</Text>
	) : undefined;
};
