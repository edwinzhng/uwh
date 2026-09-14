import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Field,
	Row,
	Stack,
	Toggle,
} from "../design-system";
import type { Member, Tracker } from "../domain/app-types";

export const TrackerField = ({
	member,
	tracker,
}: {
	member: Member;
	tracker: Tracker;
}): ReactElement => {
	const { data, dispatch, busy } = useApp();
	const saved = data.trackerValues[`${tracker.id}:${member.id}`] ?? "";
	const [draft, setDraft] = useState(saved);
	const save = (value: string): void => {
		void dispatch({
			type: "tracker-value",
			trackerId: tracker.id,
			personId: member.id,
			value,
		});
	};
	return tracker.kind === "check" ? (
		<Toggle
			label={tracker.name}
			value={
				saved === "yes" || (tracker.id === "membership" && saved === "Active")
			}
			isDisabled={busy}
			onValueChange={(value): void => save(value ? "yes" : "")}
		/>
	) : (
		<Stack gap="xs">
			{tracker.kind === "date" ? (
				<DatePicker
					label={tracker.name}
					value={draft || undefined}
					onValueChange={(value): void => setDraft(value ?? "")}
				/>
			) : (
				<Field label={tracker.name} value={draft} onValueChange={setDraft} />
			)}
			<Row justify="end">
				<Button
					label="Save"
					variant="ghost"
					validationError={
						busy || draft === saved ? "Check the required fields" : undefined
					}
					onPress={(): void => save(draft)}
				/>
			</Row>
		</Stack>
	);
};
