import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Avatar,
	Badge,
	formatTimeLocation,
	Row,
	Stack,
	SummaryCard,
	Surface,
	Text,
} from "../design-system";
import { canRegister, eventResponse, formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { eventTimeRange } from "../domain/event-card-presentation";
import { signupState } from "../domain/event-time";
import { householdMembers } from "../domain/home";
import { venueName } from "../domain/venue";
import { ResponseControl } from "./response-control";
import { useEventNow } from "./use-event-now";

export const HomePractice = ({
	event,
	responseNeeded = false,
}: {
	event?: ClubEvent;
	responseNeeded?: boolean;
}): ReactElement => {
	const router = useRouter();
	const { data, account } = useApp();
	const now = useEventNow(event);
	const open = event && !event.cancelled && signupState(event, now) === "open";
	const household = householdMembers(data, account);
	const showIdentity = household.length > 1;
	const people = household.filter(
		(person) => event && canRegister(person, event),
	);
	return (
		<SummaryCard
			title={event?.title ?? "Next practice"}
			titleVariant="h3"
			icon="calendar"
			tone={event ? "brand" : "default"}
			category="sky"
			headerTexture={event ? "watercolor-tonal" : undefined}
			borderStyle={
				event &&
				people.length &&
				people.every(
					(person) =>
						eventResponse(data, event.id, person.id).response === "unanswered",
				)
					? "dashed"
					: "solid"
			}
			onPress={
				event
					? (): void =>
							router.push({ pathname: "/session", params: { event: event.id } })
					: undefined
			}
			accessibilityLabel={
				event
					? `${responseNeeded && open ? "Response needed" : "Next practice"}. ${event.title}. ${formatDate(event.date)}. ${formatTimeLocation(eventTimeRange(event.start, event.end), venueName(event.venue))}. Open practice`
					: undefined
			}
			action={
				event && people.length ? (
					<Stack gap="md">
						{people.map((person) => (
							<Surface key={person.id} variant="subtle" padding="sm">
								<Stack gap="xs">
									{showIdentity || !event.parts?.length || !open ? (
										<Row justify="between" gap="xs" wrap>
											{showIdentity ? (
												<Row gap="xs">
													<Avatar
														name={person.name}
														personId={person.id}
														compact
													/>
													<Text variant="small" weight="medium">
														{person.name}
													</Text>
												</Row>
											) : undefined}
											{!event.parts?.length || !open ? (
												<ResponseControl
													event={event}
													personId={person.id}
													firstDivider={showIdentity}
													quick
													hideLabel
												/>
											) : undefined}
										</Row>
									) : undefined}
									{event.parts?.length && open ? (
										<ResponseControl
											event={event}
											personId={person.id}
											firstDivider={showIdentity}
											quick
											hideLabel
										/>
									) : undefined}
								</Stack>
							</Surface>
						))}
					</Stack>
				) : undefined
			}
		>
			{event ? (
				<Stack gap="xs">
					{responseNeeded && open ? (
						<Badge label="Response needed" kind="neutral" />
					) : undefined}
					<Text tone="primary">{formatDate(event.date)}</Text>
					<Text variant="caption" tone="primary" lines={1}>
						{formatTimeLocation(
							eventTimeRange(event.start, event.end),
							venueName(event.venue),
						)}
					</Text>
				</Stack>
			) : (
				<Text tone="secondary">No upcoming practices.</Text>
			)}
		</SummaryCard>
	);
};
