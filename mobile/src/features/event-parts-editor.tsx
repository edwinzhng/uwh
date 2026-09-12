import type { ReactElement } from "react";
import { newId } from "../demo/app-state";
import {
	Button,
	Field,
	Grid,
	Row,
	Stack,
	Surface,
	Text,
	TimeSelector,
} from "../design-system";
import type { EventDraft } from "../domain/app-types";
import {
	appendEventPart,
	updateEventPartTime,
} from "../domain/event-part-draft";
export const EventPartsEditor = ({
	draft,
	onChange,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
}): ReactElement => (
	<Stack gap="sm">
		<Row justify="between">
			<Text variant="h4">Practice sections</Text>
			<Button
				label="Add section"
				validationError={
					(draft.parts?.length ?? 0) >= 12 ? "Use up to 12 sections" : undefined
				}
				variant="secondary"
				prefix="plus"
				onPress={(): void => {
					onChange(appendEventPart(draft, newId()));
				}}
			/>
		</Row>
		{draft.parts?.length ? (
			draft.parts.map((part) => (
				<Surface key={part.id} variant="subtle" padding="sm">
					<Stack gap="sm">
						<Row align="end">
							<Stack grow>
								<Field
									label="Section name"
									value={part.title}
									onValueChange={(title): void =>
										onChange({
											...draft,
											parts: draft.parts?.map((entry) =>
												entry.id === part.id ? { ...entry, title } : entry,
											),
										})
									}
								/>
							</Stack>
							<Button
								label={`Remove ${part.title || "section"}`}
								icon="trash"
								variant="ghost"
								onPress={(): void => {
									const parts = draft.parts?.filter(
										(entry) => entry.id !== part.id,
									);
									onChange({
										...draft,
										parts: parts?.length ? parts : undefined,
										start: parts?.at(0)?.start ?? draft.start,
										end: parts?.at(-1)?.end ?? draft.end,
									});
								}}
							/>
						</Row>
						<Grid gap="sm">
							<TimeSelector
								label="Start time"
								value={part.start}
								onValueChange={(value): void =>
									onChange(
										updateEventPartTime(draft, part.id, "start", value ?? ""),
									)
								}
							/>
							<TimeSelector
								label="End time"
								value={part.end}
								onValueChange={(value): void =>
									onChange(
										updateEventPartTime(draft, part.id, "end", value ?? ""),
									)
								}
							/>
						</Grid>
					</Stack>
				</Surface>
			))
		) : (
			<Grid gap="sm">
				<TimeSelector
					label="Start time"
					value={draft.start}
					onValueChange={(start): void =>
						onChange({ ...draft, start: start ?? "" })
					}
				/>
				<TimeSelector
					label="End time"
					value={draft.end}
					onValueChange={(end): void => onChange({ ...draft, end: end ?? "" })}
				/>
			</Grid>
		)}
	</Stack>
);
