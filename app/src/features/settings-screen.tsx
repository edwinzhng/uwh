import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { newId, useApp, useAppStatus } from "../demo/app-state";
import {
	Badge,
	Button,
	Combobox,
	Dialog,
	Field,
	List,
	ListItem,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import type { Tracker } from "../domain/app-types";
import { defaultClubTimeZone, timeZoneOptions } from "../domain/time-zones";
import { formatVenue, parseVenue, validateVenues } from "../domain/venue";
import { AccessPanel } from "./access-panel";
import { ClubShell } from "./club-shell";
import { PublicScheduleSettings } from "./public-schedule-settings";
import { SeasonSettings } from "./season-settings";
import { useFormTask } from "./use-form-task";
import { VenueFields } from "./venue-fields";

export const SettingsScreen = (): ReactElement => {
	const { data, account, dispatch, source } = useApp();
	const { busy } = useAppStatus();
	const router = useRouter();
	const [venues, setVenues] = useState(
		(data.venues ?? []).map((venue, index) => parseVenue(venue, String(index))),
	);
	const generalTask = useFormTask();
	const [name, setName] = useState(data.clubName);
	const [timeZone, setTimeZone] = useState(
		data.timeZone ?? defaultClubTimeZone,
	);
	const [reminders, setReminders] = useState(data.reminders);
	const [add, setAdd] = useState(false);
	const [trackerName, setTrackerName] = useState("");
	const [kind, setKind] = useState<Tracker["kind"]>("check");
	const saveTracker = async (): Promise<void> => {
		if (
			await dispatch({
				type: "add-tracker",
				tracker: {
					id: newId(),
					name: trackerName.trim(),
					program: "all",
					kind,
				},
			})
		) {
			setAdd(false);
			setTrackerName("");
		}
	};
	return (
		<ClubShell
			title="Club settings"
			back={
				<Row>
					<Button
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
		>
			{!account.admin ? (
				<Text>You don’t have access to club settings.</Text>
			) : (
				<Stack gap="section">
					<Stack gap="heading">
						<SectionHeading>General</SectionHeading>
						<Surface>
							<Stack>
								<VenueFields
									venues={venues}
									onChange={setVenues}
									isDisabled={busy || generalTask.busy}
								/>
								<Field label="Club name" value={name} onValueChange={setName} />
								<Combobox
									label="Timezone"
									value={timeZone}
									options={timeZoneOptions}
									onValueChange={(value): void => {
										if (value) setTimeZone(value);
									}}
								/>
								<Text variant="caption" tone="secondary">
									Used for new events. Existing events keep their timezone.
								</Text>
								<Toggle
									label="Session reminders"
									description="Send opening and closing reminders to eligible members"
									value={reminders}
									onValueChange={setReminders}
								/>
								{generalTask.error ? (
									<Text tone="danger" variant="small">
										{generalTask.error}
									</Text>
								) : undefined}
								<Row justify="end">
									<Button
										label="Save changes"
										isLoading={busy || generalTask.busy}
										onPress={(): void => {
											void generalTask.submit(
												() =>
													!name.trim()
														? "Enter a club name"
														: validateVenues(venues),
												async (): Promise<void> => {
													const saved = await dispatch({
														type: "settings",
														clubName: name,
														venues: venues.map(formatVenue),
														reminders,
														timeZone,
													});
													if (!saved)
														throw new Error(
															"Couldn’t save settings. Try again.",
														);
												},
											);
										}}
									/>
								</Row>
							</Stack>
						</Surface>
					</Stack>
					<Stack gap="heading">
						<SectionHeading
							action={
								<Button
									label="Tracker"
									prefix="plus"
									variant="secondary"
									onPress={(): void => setAdd(true)}
								/>
							}
						>
							Member trackers
						</SectionHeading>
						<Surface>
							<List>
								{data.trackers.map((tracker) => (
									<ListItem
										key={tracker.id}
										title={
											tracker.id === "membership"
												? "CUGA membership"
												: tracker.name
										}
										description={
											tracker.kind === "check"
												? "Yes / No"
												: tracker.kind === "date"
													? "Date"
													: "Text"
										}
										trailing={
											<Badge
												label={
													tracker.kind === "check"
														? "Checkbox"
														: tracker.kind === "date"
															? "Date"
															: "Text"
												}
											/>
										}
									/>
								))}
							</List>
						</Surface>
					</Stack>
					<AccessPanel />

					<SeasonSettings />
					{source === "convex" ? <PublicScheduleSettings /> : undefined}
				</Stack>
			)}
			<Dialog
				intent="form"
				isDismissDisabled={busy}
				title="New tracker"
				isOpen={add}
				onOpenChange={(value): void => {
					if (!busy) setAdd(value);
				}}
				footer={
					<Button
						label="Add tracker"
						isLoading={busy}
						validationError={
							!trackerName.trim() ? "Check the required fields" : undefined
						}
						onPress={(): void => {
							void saveTracker();
						}}
					/>
				}
			>
				<Stack>
					<Field
						label="Name"
						value={trackerName}
						onValueChange={setTrackerName}
						placeholder="Emergency contact verified"
					/>
					<Select
						label="Type"
						value={kind}
						options={[
							{ value: "check", label: "Checkbox" },
							{ value: "text", label: "Text" },
							{ value: "date", label: "Date" },
						]}
						onValueChange={(value): void => {
							if (value) setKind(value);
						}}
					/>
					<Text variant="caption" tone="secondary">
						Admins edit these on member profiles. Members and guardians can read
						their own values.
					</Text>
				</Stack>
			</Dialog>
		</ClubShell>
	);
};
