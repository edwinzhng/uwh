import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useEffect, useState } from "react";
import { Linking } from "react-native";
import { api } from "../../convex/_generated/api";
import { Button, Dialog, Row, Stack, Text } from "../design-system";
import { calendarFeedUrl } from "../domain/calendar-links";
import { googleCalendarSubscriptionUrl } from "../domain/calendar-workflow";
import * as Clipboard from "../platform/clipboard";
import { calendarOrigin } from "./calendar-origin";
import { useTask } from "./use-task";

type Person = { id: string; name: string };

export const CalendarSubscriptions = ({
	people,
	onBusyChange,
	onCreateLink,
}: {
	people: Person[];
	onBusyChange: (busy: boolean) => void;
	onCreateLink: () => void;
}): ReactElement => {
	const feeds = useQuery(api.calendar.list, {});
	const disable = useMutation(api.calendar.disable);
	const task = useTask();
	const [manage, setManage] = useState(false);
	const [revoking, setRevoking] = useState<Person>();
	const [revokeOpen, setRevokeOpen] = useState(false);
	const [copied, setCopied] = useState<string>();
	const activePeople = people.filter((person) =>
		feeds?.some((feed) => feed.personId === person.id),
	);
	useEffect(() => {
		onBusyChange(task.busy);
		return (): void => onBusyChange(false);
	}, [onBusyChange, task.busy]);
	const subscribe = (person: Person, method: "google" | "copy"): void => {
		setCopied(undefined);
		void task.run(async (): Promise<void> => {
			const feed = feeds?.find((entry) => entry.personId === person.id);
			if (!calendarOrigin || !feed)
				throw new Error("Calendar subscriptions are unavailable.");
			const url = calendarFeedUrl(calendarOrigin, feed.token);
			if (method === "google")
				await Linking.openURL(googleCalendarSubscriptionUrl(url));
			else {
				await Clipboard.setStringAsync(url);
				setCopied(person.id);
			}
		});
	};
	return (
		<Stack gap="md">
			<Text variant="small" tone="secondary">
				Subscribe once. Your calendar app controls how quickly changes appear.
			</Text>
			{feeds === undefined ? (
				<Text variant="small" tone="secondary">
					Preparing calendar links…
				</Text>
			) : undefined}
			{people.map((person) => (
				<Stack key={person.id} gap="xs">
					{people.length > 1 ? (
						<Text variant="label">{person.name}</Text>
					) : undefined}
					{feeds !== undefined &&
					!feeds.some((feed) => feed.personId === person.id) ? (
						<Button
							label="Create subscription link"
							variant="secondary"
							isDisabled={task.busy}
							onPress={onCreateLink}
						/>
					) : (
						<Row gap="xs" wrap>
							<Button
								label="Add to Google Calendar"
								prefix="calendar"
								variant="secondary"
								isDisabled={
									task.busy ||
									!feeds?.some((feed) => feed.personId === person.id)
								}
								onPress={(): void => subscribe(person, "google")}
							/>
							<Button
								label="Copy link"
								prefix="copy"
								variant="ghost"
								isDisabled={
									task.busy ||
									!feeds?.some((feed) => feed.personId === person.id)
								}
								onPress={(): void => subscribe(person, "copy")}
							/>
						</Row>
					)}
					{copied === person.id ? (
						<Text variant="small" tone="secondary">
							Link copied. Add it as a subscribed calendar in Apple Calendar,
							Outlook or another calendar app.
						</Text>
					) : undefined}
				</Stack>
			))}
			<Text variant="caption" tone="secondary">
				Anyone with a subscription link can view that schedule. Keep it private.
			</Text>
			{activePeople.length ? (
				<Button
					label={manage ? "Hide link settings" : "Manage links"}
					variant="ghost"
					isDisabled={task.busy}
					onPress={(): void => setManage((value) => !value)}
				/>
			) : undefined}
			{manage ? (
				<Stack gap="sm">
					{activePeople.map((person) => (
						<Row key={person.id} wrap justify="between">
							<Text variant="small">{person.name}</Text>
							<Button
								label="Revoke link"
								variant="danger-text"
								isDisabled={task.busy}
								onPress={(): void => {
									task.clear();
									setRevoking(person);
									setRevokeOpen(true);
								}}
							/>
						</Row>
					))}
				</Stack>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<Dialog
				title="Revoke calendar link?"
				intent="confirmation"
				isDismissDisabled={task.busy}
				isOpen={revokeOpen}
				onOpenChange={(open): void => {
					if (!task.busy) setRevokeOpen(open);
				}}
				footer={false}
			>
				<Stack gap="md">
					<Text>
						This stops future updates for {revoking?.name} through the current
						link. Events already saved in a calendar may remain.
					</Text>
					<Row justify="end" gap="xs" wrap>
						<Button
							label="Keep link"
							variant="secondary"
							isDisabled={task.busy}
							onPress={(): void => setRevokeOpen(false)}
						/>
						<Button
							label="Revoke link"
							variant="danger"
							isLoading={task.busy}
							onPress={(): void => {
								if (!revoking) return;
								const personId = revoking.id;
								void task.run(async (): Promise<void> => {
									await disable({ personId });
									setCopied(undefined);
									setRevokeOpen(false);
								});
							}}
						/>
					</Row>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</Stack>
	);
};
