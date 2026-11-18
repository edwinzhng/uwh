import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Row, Stack, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import { countdownLabel, upcomingCountdowns } from "../domain/countdown";
import { venueName } from "../domain/venue";
import { useClubToday } from "./use-club-today";

export const HomeCountdown = (): ReactElement | undefined => {
	const { data } = useApp();
	const router = useRouter();
	const [next, ...later] = upcomingCountdowns(data.events, useClubToday());
	if (!next) return undefined;
	const counting = !next.underway && next.days > 1;
	return (
		<SummaryCard
			title="Countdown"
			icon="trophy"
			compact
			accessibilityLabel={`${next.event.title}, ${countdownLabel(next)}. Open event details`}
			onPress={(): void =>
				router.push({ pathname: "/session", params: { event: next.event.id } })
			}
		>
			<Stack gap="xs">
				<Row gap="xs" align="end" wrap>
					<Text variant="number" tone="highlight">
						{counting ? next.days : countdownLabel(next)}
					</Text>
					{counting ? (
						<Text variant="small" tone="highlight" weight="medium">
							days to go
						</Text>
					) : undefined}
				</Row>
				<Text variant="h4">{next.event.title}</Text>
				<Text variant="small" tone="secondary">
					{[
						formatDate(next.event.date),
						next.event.endDate && next.event.endDate !== next.event.date
							? formatDate(next.event.endDate)
							: undefined,
					]
						.filter(Boolean)
						.join(" – ")}
					{next.event.venue ? ` · ${venueName(next.event.venue)}` : ""}
				</Text>
				{later.map((entry) => (
					<Row key={entry.event.id} justify="between" gap="sm">
						<Text variant="small" weight="medium" lines={1}>
							{entry.event.title}
						</Text>
						<Text variant="small" tone="highlight" weight="medium">
							{countdownLabel(entry)}
						</Text>
					</Row>
				))}
			</Stack>
		</SummaryCard>
	);
};
