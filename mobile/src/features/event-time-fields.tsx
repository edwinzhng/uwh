import type { ReactElement } from "react";
import { Grid, Surface, Text, TimeSelector } from "../design-system";
import type { EventDraft } from "../domain/app-types";
export const EventTimeFields = ({
	draft,
	onChange,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
}): ReactElement => (
	<Surface header={<Text variant="h4">Time</Text>}>
		<Grid gap="md">
			<TimeSelector
				label="Start"
				value={draft.start}
				onValueChange={(start): void =>
					onChange({ ...draft, start: start ?? "" })
				}
			/>
			<TimeSelector
				label="End"
				value={draft.end}
				onValueChange={(end): void => onChange({ ...draft, end: end ?? "" })}
			/>
		</Grid>
	</Surface>
);
