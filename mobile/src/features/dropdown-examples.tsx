import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import { players } from "../demo/data";
import {
	ActionMenu,
	type ChoiceOption,
	Combobox,
	Grid,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";

const eventTypeAtom = atom<string | undefined>("practice");
const playerAtom = atom<string | undefined>(undefined);
const selectedActionAtom = atom("");
const statusAtom = atom<string | undefined>("going");
const statuses: ChoiceOption<string>[] = [
	{ value: "going", label: "Going", tone: "success" },
	{ value: "unavailable", label: "Not going", tone: "danger" },
	{ value: "unanswered", label: "Not responded", tone: "warning" },
	{ value: "waiting", label: "Waitlisted", tone: "warning" },
];

export const DropdownExamples = (): ReactElement => {
	const [eventType, setEventType] = useAtom(eventTypeAtom);
	const [player, setPlayer] = useAtom(playerAtom);
	const [action, setAction] = useAtom(selectedActionAtom);
	const [status, setStatus] = useAtom(statusAtom);
	return (
		<Stack>
			<Text variant="h4">Dropdowns</Text>
			<Grid>
				<Select
					label="Status"
					value={status}
					onValueChange={setStatus}
					options={statuses}
				/>
				<Select
					label="Event type"
					value={eventType}
					onValueChange={setEventType}
					options={[
						{ value: "practice", label: "Practice", icon: "waves" },
						{ value: "match", label: "Match", icon: "target" },
						{ value: "social", label: "Social", icon: "users" },
						{
							value: "archived",
							label: "Archived",
							icon: "archive",
							isDisabled: true,
						},
					]}
				/>
				<Combobox
					label="Player"
					value={player}
					onValueChange={setPlayer}
					placeholder="Find a player…"
					options={players.map((member) => ({
						value: member.id,
						label: member.name,
					}))}
				/>
				<Stack gap="xs">
					<Text variant="caption" tone="secondary">
						Menu
					</Text>
					<Row>
						<ActionMenu
							label="Actions"
							groups={[
								{
									id: "session",
									label: "Session",
									items: [
										{
											id: "edit",
											label: "Edit details",
											icon: "edit",
											onSelect: (): void => setAction("Edit selected"),
										},
										{
											id: "duplicate",
											label: "Duplicate",
											icon: "copy",
											onSelect: (): void => setAction("Duplicate selected"),
										},
										{
											id: "export",
											label: "Export",
											icon: "download",
											isDisabled: true,
											onSelect: (): void => undefined,
										},
									],
								},
								{
									id: "manage",
									items: [
										{
											id: "archive",
											label: "Archive",
											icon: "archive",
											tone: "danger",
											onSelect: (): void => setAction("Archive selected"),
										},
									],
								},
							]}
						/>
					</Row>
					{action ? (
						<Text variant="caption" tone="secondary">
							{action}
						</Text>
					) : undefined}
				</Stack>
			</Grid>
		</Stack>
	);
};
