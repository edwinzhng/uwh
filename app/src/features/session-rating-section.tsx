import type { ReactElement } from "react";
import type { SessionPerformanceService } from "../backend/use-session-performance";
import { Button, SectionHeading, Stack, Surface, Text } from "../design-system";
import type { SessionPerformanceEntry } from "../domain/session-performance";
import { SessionPerformanceCard } from "./session-performance-card";

export const SessionRatingSection = ({
	title,
	entries,
	actionLabel,
	onAdd,
	onEdit,
	report,
}: {
	title: string;
	entries: SessionPerformanceEntry[];
	actionLabel: string;
	onAdd?: () => void;
	onEdit: (entry: SessionPerformanceEntry) => void;
	report: SessionPerformanceService["report"];
}): ReactElement => (
	<Surface variant="plain">
		<Stack gap="sm">
			<SectionHeading
				action={
					onAdd ? (
						<Button
							label={actionLabel}
							compact
							variant="secondary"
							onPress={onAdd}
						/>
					) : undefined
				}
			>
				{title}
			</SectionHeading>
			{entries.length ? (
				entries.map((entry) => (
					<SessionPerformanceCard
						key={entry.id}
						embedded
						entry={entry}
						report={report}
						onEdit={(): void => onEdit(entry)}
					/>
				))
			) : (
				<Text variant="small" tone="secondary">
					No reflections yet.
				</Text>
			)}
		</Stack>
	</Surface>
);
