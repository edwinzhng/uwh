import { useAction, useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import type { ReactElement } from "react";
import { Linking } from "react-native";
import { api } from "../../convex/_generated/api";
import { Button, Row, Stack, Surface, Text } from "../design-system";
import {
	calendarFeedUrl,
	isHostedCalendarOrigin,
} from "../domain/calendar-links";
import { useTask } from "./use-task";

export const CalendarSubscriptions = ({
	people,
}: {
	people: { id: string; name: string }[];
}): ReactElement => {
	const feeds = useQuery(api.calendar.list, {});
	const enable = useAction(api.calendar_tokens.enable);
	const disable = useMutation(api.calendar.disable);
	const task = useTask();
	const origin =
		process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
		process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
			".convex.cloud",
			".convex.site",
		).replace(":3210", ":3211");
	return (
		<Surface header={<Text variant="h4">Automatic updates</Text>}>
			<Stack gap="sm">
				<Text variant="small" tone="secondary">
					Subscribe once to keep your registered events up to date. Google
					controls when changes appear.
				</Text>
				{origin && isHostedCalendarOrigin(origin) ? (
					people.map((person) => {
						const feed = feeds?.find((entry) => entry.personId === person.id);
						const url = feed ? calendarFeedUrl(origin, feed.token) : undefined;
						return (
							<Stack key={person.id} gap="xs">
								<Text variant="label">{person.name}</Text>
								<Row wrap gap="xs">
									{url ? (
										<>
											<Button
												label="Add to Google Calendar"
												prefix="calendar"
												variant="secondary"
												onPress={(): void => {
													void task.run(async (): Promise<void> => {
														await Linking.openURL(
															`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(url)}`,
														);
													});
												}}
											/>
											<Button
												label="Copy subscription link"
												variant="ghost"
												onPress={(): void => {
													void task.run(async (): Promise<void> => {
														await Clipboard.setStringAsync(url);
													});
												}}
											/>
											<Button
												label="Disable link"
												variant="ghost"
												onPress={(): void => {
													void task.run(async (): Promise<void> => {
														await disable({ personId: person.id });
													});
												}}
											/>
										</>
									) : (
										<Button
											label="Enable subscription"
											variant="secondary"
											isLoading={task.busy}
											onPress={(): void => {
												void task.run(async (): Promise<void> => {
													await enable({
														personId: person.id,
														includeWaitlisted: false,
													});
												});
											}}
										/>
									)}
								</Row>
							</Stack>
						);
					})
				) : (
					<Text variant="small" tone="secondary">
						Subscriptions are available on the hosted app. Google cannot reach a
						calendar running on localhost.
					</Text>
				)}
				<Text variant="caption" tone="secondary">
					Keep subscription links private: anyone with the link can view that
					calendar. Disable a link here to revoke access.
				</Text>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Surface>
	);
};
