import type { ReactElement } from "react";
import type { ImportHistoryEntry } from "../demo/import-state";
import { EmptyState, Stack, Text } from "../design-system";
import { displayDate } from "../domain/date-display";

export const ImportHistory = ({
	entries,
}: {
	entries: ImportHistoryEntry[];
}): ReactElement => (
	<Stack>
		{entries.map((entry) => (
			<Stack key={entry.id} gap="xxs">
				<Text variant="small">
					{entry.source} · {entry.kind} · {entry.created} added, {entry.skipped}{" "}
					linked or skipped
				</Text>
				<Text variant="caption" tone="secondary">
					{displayDate(entry.createdAt)} · {entry.actor}
				</Text>
			</Stack>
		))}
		{!entries.length ? <EmptyState title="No imports" /> : undefined}
	</Stack>
);
