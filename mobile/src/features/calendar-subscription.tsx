import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { type ReactElement, useMemo, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Badge,
	Button,
	Dialog,
	FileDownload,
	Row,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import type { Member } from "../domain/app-types";
import {
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../domain/calendar-export";
import {
	calendarFeedUrl,
	isHostedCalendarOrigin,
} from "../domain/calendar-links";

const calendarOrigin =
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
	process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
		".convex.cloud",
		".convex.site",
	).replace(":3210", ":3211");
const hosted = isHostedCalendarOrigin(calendarOrigin);
export const CalendarSubscription = ({
	person,
}: {
	person: Member;
}): ReactElement => {
	const { data, source } = useApp();
	const { calendars, clubCode } = useBackend();
	const feed =
		source === "convex"
			? calendars?.feeds.find((entry) => entry.personId === person.id)
			: undefined;
	const [includeWaitlisted, setIncludeWaitlisted] = useState(false);
	const includeWaiting = feed?.includeWaitlisted ?? includeWaitlisted;
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const [copied, setCopied] = useState<string>();
	const [confirm, setConfirm] = useState<"rotate" | "disable">();
	const url =
		feed && calendarOrigin
			? calendarFeedUrl(calendarOrigin, feed.token)
			: undefined;
	const events = useMemo(
		() =>
			personalCalendarEvents(
				data.events,
				data.responses,
				person.id,
				person.programs,
				includeWaiting,
			),
		[data.events, data.responses, person.id, person.programs, includeWaiting],
	);
	const snapshot = useMemo(
		() =>
			renderCalendar(
				`${data.clubName} · ${person.name}`,
				reconcileCalendar(
					[],
					events,
					clubCode ?? "preview",
					person.id,
					Date.now(),
				),
			),
		[events, clubCode, data.clubName, person.id, person.name],
	);
	const run = async (action: () => Promise<void>): Promise<void> => {
		if (busy) return;
		setBusy(true);
		setError(undefined);
		try {
			await action();
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Stack gap="sm">
			<Row justify="between" wrap>
				<Text variant="small" tone="secondary">
					{events.length} practices
				</Text>
				{feed ? (
					<Badge label={hosted ? "Subscription ready" : "Local feed"} />
				) : undefined}
			</Row>
			<Text variant="small" tone="secondary">
				Going adds a practice. Not going removes it.
			</Text>
			<Toggle
				label="Include waitlisted practices"
				value={includeWaiting}
				isDisabled={busy}
				onValueChange={(value): void => {
					if (feed && calendars) {
						void run(async (): Promise<void> => {
							await calendars.preferences(person.id, value);
						});
					} else setIncludeWaitlisted(value);
				}}
			/>
			{source === "preview" ? (
				<Text variant="caption" tone="secondary">
					Sample export. Sign in to create a live calendar.
				</Text>
			) : !hosted ? (
				<Text variant="caption" tone="secondary">
					Google sync needs the hosted app. Downloads work now.
				</Text>
			) : (
				<Text variant="caption" tone="secondary">
					Updates appear when Google refreshes. Change RSVPs here.
				</Text>
			)}
			<Row wrap gap="xs">
				{feed && url ? (
					<Button
						label={copied === url ? "Copied" : "Copy calendar link"}
						prefix="copy"
						isDisabled={busy}
						onPress={(): void => {
							void run(async (): Promise<void> => {
								const success = await Clipboard.setStringAsync(url);
								if (!success) throw new Error("Could not copy link.");
								setCopied(url);
							});
						}}
					/>
				) : source === "convex" && calendars ? (
					<Button
						label="Create calendar link"
						prefix="calendar"
						isLoading={busy}
						isDisabled={calendars.loading}
						onPress={(): void => {
							void run(async (): Promise<void> => {
								await calendars.enable(person.id, includeWaiting);
							});
						}}
					/>
				) : undefined}
				{feed && hosted ? (
					<Button
						label="Open Google Calendar"
						variant="secondary"
						isDisabled={busy}
						onPress={(): void => {
							void run(async (): Promise<void> => {
								await Linking.openURL(
									"https://calendar.google.com/calendar/u/0/r/settings/addbyurl",
								);
							});
						}}
					/>
				) : undefined}
				<FileDownload
					label="Download .ics"
					filename={`crocs-${person.id.replace(/[^a-zA-Z0-9_-]/g, "")}.ics`}
					contents={snapshot}
					onError={setError}
				/>
				{feed ? (
					<ActionMenu
						label="Calendar options"
						isDisabled={busy}
						groups={[
							{
								id: "subscription",
								items: [
									{
										id: "rotate",
										label: "Replace link",
										onSelect: (): void => setConfirm("rotate"),
									},
									{
										id: "disable",
										label: "Disable link",
										tone: "danger",
										onSelect: (): void => setConfirm("disable"),
									},
								],
							},
						]}
					/>
				) : undefined}
			</Row>
			<Text variant="caption" tone="secondary">
				Downloads are a snapshot and won’t sync.
			</Text>
			{feed ? (
				<Text variant="caption" tone="secondary">
					Keep this link private. Anyone with it can view these practices.
				</Text>
			) : undefined}
			{feed && hosted ? (
				<Text variant="caption" tone="secondary">
					In Google Calendar on a computer: Other calendars → From URL → paste
					the link.
				</Text>
			) : undefined}
			{error ? (
				<Text variant="small" tone="danger">
					{error}
				</Text>
			) : undefined}
			<Dialog
				isOpen={confirm !== undefined}
				onOpenChange={(open): void => {
					if (!open) setConfirm(undefined);
				}}
				title={
					confirm === "rotate"
						? "Replace calendar link?"
						: "Disable calendar link?"
				}
				footer={
					<Row gap="xs">
						<Button
							label="Cancel"
							variant="ghost"
							isDisabled={busy}
							onPress={(): void => setConfirm(undefined)}
						/>
						<Button
							label={confirm === "rotate" ? "Replace link" : "Disable link"}
							variant="danger"
							isLoading={busy}
							onPress={(): void => {
								void run(async (): Promise<void> => {
									if (!calendars) return;
									if (confirm === "rotate")
										await calendars.enable(person.id, includeWaiting, true);
									else await calendars.disable(person.id);
									setConfirm(undefined);
								});
							}}
						/>
					</Row>
				}
			>
				<Text variant="small">
					{confirm === "rotate"
						? "The old link will stop working. Add the new link in Google Calendar."
						: "This stops future updates. Remove the calendar in Google Calendar too."}
				</Text>
			</Dialog>
		</Stack>
	);
};
