import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import {
	Badge,
	Button,
	Calendar,
	ContentRow,
	CurrentComponentExamples,
	Dialog,
	EmptyState,
	EventActions,
	EventCard,
	Field,
	FoundationReference,
	GlassPanel,
	Grid,
	Progress,
	RollingNumber,
	Row,
	reduceMotionAtom,
	SegmentedControl,
	Select,
	Stack,
	Surface,
	Text,
	ThemeToggle,
	Toggle,
	themePreferenceAtom,
} from "../design-system";
import { clubDate } from "../domain/event-time";
import { ClubShell } from "./club-shell";
import { DateTimeExamples } from "./date-time-examples";
import { DialogExample } from "./dialog-example";
import { DropdownExamples } from "./dropdown-examples";
import { responseOptions } from "./response-options";

const countAtom = atom(24);
const inputAtom = atom("");
const validationAtom = atom("");
const notificationAtom = atom(true);
const actionDialogAtom = atom(false);
const dangerDialogAtom = atom(false);
const periodAtom = atom("week");
const calendarDateAtom = atom("2026-09-10");
const eventResponseAtom = atom("unavailable");

export const DesignSystemScreen = (): ReactElement => {
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	const [period, setPeriod] = useAtom(periodAtom);
	const [reduced, setReduced] = useAtom(reduceMotionAtom);
	const [count, setCount] = useAtom(countAtom);
	const [input, setInput] = useAtom(inputAtom);
	const [validation, setValidation] = useAtom(validationAtom);
	const [notifications, setNotifications] = useAtom(notificationAtom);
	const [actionOpen, setActionOpen] = useAtom(actionDialogAtom);
	const [dangerOpen, setDangerOpen] = useAtom(dangerDialogAtom);
	const [calendarDate, setCalendarDate] = useAtom(calendarDateAtom);
	const [eventResponse, setEventResponse] = useAtom(eventResponseAtom);
	return (
		<ClubShell
			title="Design system"
			subtitle="Live components, foundations, and interaction states."
		>
			<ThemeToggle value={theme} onValueChange={setTheme} />
			<Stack>
				<Text variant="h4">Calendar</Text>
				<Surface>
					<Calendar
						value={calendarDate}
						today={clubDate()}
						counts={{ "2026-09-10": 3, "2026-09-13": 1, "2026-09-18": 1 }}
						onValueChange={setCalendarDate}
					/>
				</Surface>
			</Stack>
			<Stack>
				<Text variant="h4">Surfaces</Text>
				<Grid>
					<Surface>
						<Text variant="label">Panel</Text>
					</Surface>
					<GlassPanel material="floating" shape="panel">
						<Row justify="between">
							<Text variant="label">Floating</Text>
							<Badge label="Navigation" />
						</Row>
					</GlassPanel>
				</Grid>
			</Stack>
			<Stack>
				<Text variant="h4">Buttons</Text>
				<Row wrap>
					<Button label="Primary" onPress={(): void => setActionOpen(true)} />
					<Button
						label="New event"
						prefix="plus"
						staffRole="admin"
						onPress={(): void => setActionOpen(true)}
					/>
					<Button
						label="Feedback"
						prefix="plus"
						variant="secondary"
						staffRole="coach"
						onPress={(): void => setActionOpen(true)}
					/>
					<Button
						label="Secondary"
						variant="secondary"
						onPress={(): void => setActionOpen(true)}
					/>
					<Button
						label="Text button"
						variant="ghost"
						onPress={(): void => setActionOpen(true)}
					/>
					<Button label="Disabled" isDisabled onPress={(): void => undefined} />
					<Button
						label="Danger"
						prefix="archive"
						variant="danger"
						onPress={(): void => setDangerOpen(true)}
					/>
					<Button label="Loading" isLoading onPress={(): void => undefined} />
				</Row>
				<SegmentedControl
					label="Segments"
					value={period}
					onValueChange={setPeriod}
					options={[
						{ value: "week", label: "Week" },
						{ value: "month", label: "Month" },
						{ value: "season", label: "Season" },
					]}
				/>
				<Dialog
					isOpen={actionOpen}
					onOpenChange={setActionOpen}
					title="Action complete"
				>
					<Badge label="Success" kind="success" />
				</Dialog>
				<Dialog
					isOpen={dangerOpen}
					onOpenChange={setDangerOpen}
					title="Danger action"
				>
					<Badge label="Preview" kind="danger" />
				</Dialog>
			</Stack>
			<CurrentComponentExamples />
			<DropdownExamples />
			<DateTimeExamples />
			<Grid>
				<Stack>
					<Text variant="h4">Fields</Text>
					<Field
						label="Session"
						value={input}
						onValueChange={setInput}
						placeholder="Monday practice"
					/>
					<Field
						label="Validation"
						value={validation}
						onValueChange={setValidation}
						placeholder="Session name"
						error={validation.trim() ? undefined : "Required"}
					/>
				</Stack>
				<Stack>
					<Text variant="h4">Switches</Text>
					<Toggle
						label="Reminders"
						value={notifications}
						onValueChange={setNotifications}
					/>
					<Toggle
						label="Reduce motion"
						value={reduced}
						onValueChange={setReduced}
					/>
					<Toggle
						label="Disabled off"
						value={false}
						isDisabled
						onValueChange={(): void => undefined}
					/>
					<Toggle
						label="Disabled on"
						value
						isDisabled
						onValueChange={(): void => undefined}
					/>
				</Stack>
			</Grid>
			<Stack>
				<Text variant="h4">Status</Text>
				<Row wrap>
					<Badge label="Neutral" />
					<Badge label="Club" kind="brand" />
					<Badge label="Success" kind="success" />
					<Badge label="Warning" kind="warning" />
					<Badge label="Danger" kind="danger" />
				</Row>
			</Stack>
			<Stack>
				<Text variant="h4">App controls</Text>
				<EventCard
					title="Club training"
					time="7:45 PM"
					endTime="9:00 PM"
					venue="MNP Centre"
					onOpen={(): void => setActionOpen(true)}
					actions={
						<EventActions
							status={
								<Select
									label="Status"
									value={eventResponse}
									options={responseOptions({
										full: false,
										response: eventResponse,
									})}
									onValueChange={(value): void =>
										setEventResponse(value ?? "unanswered")
									}
								/>
							}
							attendanceCount={count}
							onAttendance={(): void => setActionOpen(true)}
						/>
					}
				/>
			</Stack>
			<Grid>
				<Stack>
					<Text variant="h4">Numbers</Text>
					<Row>
						<Button
							label="Remove"
							prefix="minus"
							variant="secondary"
							isDisabled={count <= 0}
							onPress={(): void => setCount((value) => Math.max(0, value - 1))}
						/>
						<RollingNumber value={count} label="players" />
						<Button
							label="Add"
							prefix="plus"
							variant="secondary"
							onPress={(): void => setCount((value) => value + 1)}
						/>
					</Row>
					<Progress label="Capacity" value={Math.min(count, 32)} max={32} />
				</Stack>
				<Stack>
					<Text variant="h4">Rows</Text>
					<ContentRow
						title="Sam Rivera"
						description="Forward"
						identity="Sam Rivera"
						control={<Badge label="Going" kind="success" />}
					/>
					<EmptyState
						title="No sessions yet"
						description="Scheduled sessions will appear here."
					/>
				</Stack>
			</Grid>
			<Stack>
				<Text variant="h4">Dialog</Text>
				<DialogExample />
			</Stack>
			<FoundationReference />
		</ClubShell>
	);
};
