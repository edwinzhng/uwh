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
	embedded = false,
}: {
	entry: SessionPerformanceEntry;
	onEdit: () => void;
	report: SessionPerformanceService["report"];
	embedded?: boolean;
}): ReactElement => {
	const router = useRouter();
	const Container = embedded ? Stack : Surface;
	return (
		<Container padding={embedded ? "none" : "sm"}>
			<Stack gap="sm">
				<Row justify="between" align="start">
					<Stack gap="xxs" grow>
						<Text variant="h4">{entry.eventTitle}</Text>
						<Text variant="caption">{sessionRatingMetadata(entry)}</Text>
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
				<Row justify="between" align="end" wrap>
					<Stack gap="none">
						<Text variant="caption">
							{entry.kind === "coach" ? "Coach rating" : "Self-rating"}
						</Text>
						<Text variant="number">
							{entry.rating}
							<Text variant="small">/10</Text>
						</Text>
					</Stack>
					<Row gap="xs" wrap>
						{entry.dateKind !== "recorded" ? (
							<Button
								label="Open session"
								prefix="chevron"
								variant="secondary"
								onPress={(): void =>
									router.push({
										pathname: "/session",
										params: { event: entry.eventId },
									})
								}
							/>
						) : (
							<Text variant="caption" tone="secondary">
								Session date unavailable
							</Text>
						)}
						{entry.canReport ? (
							<SessionPerformanceReport entry={entry} report={report} />
						) : undefined}
					</Row>
				</Row>
			</Stack>
		</Container>
	);
};
