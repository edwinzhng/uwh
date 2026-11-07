import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import type { SessionPerformanceService } from "../backend/use-session-performance";
import {
	Button,
	IconButton,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { SessionPerformanceEntry } from "../domain/session-performance";
import { sessionRatingMetadata } from "./session-feedback-view";
import { SessionPerformanceReport } from "./session-performance-report";

export const SessionPerformanceCard = ({
	entry,
	onEdit,
	report,
}: {
	entry: SessionPerformanceEntry;
	onEdit: () => void;
	report: SessionPerformanceService["report"];
}): ReactElement => {
	const router = useRouter();
	return (
		<Surface density="compact">
			<Stack gap="sm">
				<Row justify="between" align="start">
					<Stack gap="xxs" grow>
						<Text variant="h4">{entry.eventTitle}</Text>
						<Text variant="small" tone="secondary">
							{sessionRatingMetadata(entry)}
						</Text>
					</Stack>
					{entry.canEdit ? (
						<IconButton
							label={`Edit ${entry.kind === "coach" ? "coach rating" : "self-rating"} for ${entry.eventTitle}`}
							icon="edit"
							onPress={onEdit}
						/>
					) : undefined}
				</Row>
				{entry.comments ? (
					<Text variant="small">{entry.comments}</Text>
				) : undefined}
				<Row justify="between" gap="xs" wrap>
					<Text variant="small" tone="secondary">
						{entry.kind === "coach" ? "Coach rating" : "Self-rating"}
						{" · "}
						<Text variant="small" weight="semibold">
							{entry.rating}/10
						</Text>
					</Text>
					<Row gap="xs" wrap>
						{entry.dateKind !== "recorded" ? (
							<Button
								label="Open session"
								prefix="chevron"
								variant="secondary"
								compact
								onPress={(): void =>
									router.push({
										pathname: "/session",
										params: { event: entry.eventId },
									})
								}
							/>
						) : undefined}
						{entry.canReport ? (
							<SessionPerformanceReport entry={entry} report={report} />
						) : undefined}
					</Row>
				</Row>
			</Stack>
		</Surface>
	);
};
