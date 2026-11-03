import type { ReactElement } from "react";
import { List, Row, Stack, Text } from "../design-system";
import { formatDate, money } from "../domain/app-rules";
import {
	type SeasonHistoryEntry,
	seasonHistoryEvents,
} from "../domain/season-history";

export const SeasonHistory = ({
	entries,
}: {
	entries: SeasonHistoryEntry[];
}): ReactElement => {
	const events = seasonHistoryEvents(entries);
	return (
		<List gap="md">
			{events.map((entry) => (
				<Stack key={entry.id} gap="xxs">
					<Row justify="between" wrap>
						<Text variant="label">{entry.title}</Text>
						{entry.amount !== undefined ? (
							<Text variant="label">{money(entry.amount)}</Text>
						) : undefined}
					</Row>
					{entry.note ? <Text variant="small">{entry.note}</Text> : undefined}
					<Text variant="caption" tone="secondary">
						{formatDate(entry.date)} · {entry.actor}
					</Text>
				</Stack>
			))}
			{!events.length ? (
				<Text variant="small" tone="secondary">
					No changes this season
				</Text>
			) : undefined}
		</List>
	);
};
