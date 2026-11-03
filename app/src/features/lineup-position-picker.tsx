import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Dialog,
	EmptyState,
	List,
	ListItem,
	Select,
	Stack,
	Text,
} from "../design-system";
import { eventAttendees } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	formationPositions,
	type LineupSide,
	lineupLocation,
	lineupPersonSlot,
	lineupSnapshot,
} from "../domain/lineup";
import {
	type AgeGroup,
	defaultPlayerCoaching,
	positionLabel,
} from "../domain/player-coaching";

export type LineupPositionTarget = {
	side: LineupSide;
	slot: number;
	label: string;
	group: AgeGroup | "combined";
};
export const LineupPositionPicker = ({
	plan,
	target,
	busy,
	isDisabled = false,
	error,
	onAdd,
	onClose,
}: {
	plan: TeamPlan;
	target: LineupPositionTarget;
	busy: boolean;
	isDisabled?: boolean;
	error?: string;
	onAdd: (
		personId: string,
		slot: number,
		ageGroup: AgeGroup,
	) => Promise<boolean>;
	onClose: () => void;
}): ReactElement => {
	const { data } = useApp();
	const snapshot = lineupSnapshot(plan);
	const [slot, setSlot] = useState(target.slot);
	const formation =
		target.side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const profileFor = (id: string): AgeGroup =>
		plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
		data.playerCoaching?.find((entry) => entry.personId === id)?.ageGroup ??
		(data.members.find((member) => member.id === id)?.programs.includes("youth")
			? "youth"
			: "adult");
	const players = eventAttendees(data, plan.eventId, plan.partId).filter(
		(member) =>
			target.group === "combined" || profileFor(member.id) === target.group,
	);
	return (
		<Dialog
			intent="picker"
			title={`Add player · ${target.side === "black" ? "Black" : "White"}`}
			isOpen
			isDismissDisabled={busy}
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
		>
			<Stack>
				<Select
					label="Position"
					value={String(slot)}
					options={formationPositions[formation].map((position, index) => ({
						value: String(index),
						label: `${index + 1} · ${positionLabel(position, formation)}`,
					}))}
					onValueChange={(value): void => {
						if (value !== undefined) setSlot(Number(value));
					}}
					isDisabled={busy || isDisabled}
				/>
				{players.length ? (
					<List>
						{players.map((member) => {
							const location = lineupLocation(snapshot, member.id);
							const currentSlot = lineupPersonSlot(snapshot, member.id);
							const alreadyAssigned =
								(location === target.side ||
									location === `${target.side}Bench`) &&
								currentSlot === slot;
							return (
								<ListItem
									key={member.id}
									title={member.name}
									avatar={member.name}
									avatarId={member.id}
									description={
										alreadyAssigned
											? "Already in this position"
											: location
												? `${location.startsWith("black") ? "Black" : "White"} · ${positionLabel(snapshot.positions.find((entry) => entry.personId === member.id)?.position ?? defaultPlayerCoaching(member).positions.at(0) ?? "FORWARD", location.startsWith("black") ? snapshot.blackFormation : snapshot.whiteFormation)}`
												: "Not in the lineup"
									}
									onPress={
										busy || isDisabled || alreadyAssigned
											? undefined
											: (): void => {
													void onAdd(
														member.id,
														slot,
														profileFor(member.id),
													).then((added): void => {
														if (added) onClose();
													});
												}
									}
								/>
							);
						})}
					</List>
				) : (
					<EmptyState
						title="No attending players"
						description="Only players who RSVP’d Yes can be added."
					/>
				)}
				{error ? (
					<Text variant="small" tone="danger">
						{error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
