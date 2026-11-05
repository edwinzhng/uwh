import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	LineupRoleMenu,
	PoolBoard,
	type PoolBoardSpot,
	Row,
	Select,
	Stack,
} from "../design-system";
import { eventAttendees, memberName } from "../domain/app-rules";
import type { TeamFormation, TeamPlan } from "../domain/app-types";
import {
	formationOptions,
	formationPositions,
	type LineupSide,
	lineupPeople,
	lineupSlotAbbreviation,
	lineupSlotLabel,
	lineupSnapshot,
	lineupTeamPeople,
} from "../domain/lineup";
import { lineupDisplayNames } from "../domain/lineup-display-name";
import type { AgeGroup } from "../domain/player-coaching";
import { TeamCaptain } from "./team-captain";
import { TeamStrength } from "./team-strength";

export const TeamPool = ({
	plan,
	side,
	group,
	selectedPersonId,
	onPlace,
	onAdd,
	onSwap,
	onFormationChange,
	onCaptainChange,
	onRefereeChange,
}: {
	plan: TeamPlan;
	side: LineupSide;
	group: AgeGroup | "combined";
	selectedPersonId?: string;
	onPlace?: (personId: string, slot: number) => void;
	onAdd?: (personId: string, slot: number) => void;
	onSwap?: (personId: string, otherId: string) => void;
	onFormationChange?: (formation: TeamFormation) => void;
	onCaptainChange?: (personId?: string) => void;
	onRefereeChange?: (personId?: string) => void;
}): ReactElement => {
	const { data } = useApp();
	const snapshot = lineupSnapshot(plan);
	const formation =
		side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const inGroup = (id: string): boolean =>
		group === "combined" ||
		(plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
			"adult") === group;
	const displayNames = lineupDisplayNames(
		[
			...lineupPeople(snapshot).filter(inGroup),
			...(plan.referees ?? []).map((referee) => referee.personId),
		].map((id) => ({ id, name: memberName(data, id) })),
	);
	const captain = plan.captains?.find(
		(entry) => entry.side === side && inGroup(entry.personId),
	);
	const person = (
		id: string,
	): { id: string; name: string; displayName?: string; captain: boolean } => ({
		id,
		name: memberName(data, id),
		displayName: displayNames.get(id),
		captain: captain?.personId === id,
	});
	const teamPeople = lineupTeamPeople(snapshot, side).filter(inGroup);
	const referee = plan.referees?.find((entry) => entry.side === side);
	const spots = formationPositions[formation].map((_, slot) => {
		const occupant = snapshot.fieldSlots?.find(
			(entry) =>
				entry.slot === slot &&
				snapshot[side].includes(entry.personId) &&
				inGroup(entry.personId),
		);
		return {
			id: String(slot),
			label: lineupSlotLabel(formation, slot),
			shortLabel: lineupSlotAbbreviation(formation, slot),
			addOptions: onAdd
				? eventAttendees(data, plan.eventId, plan.partId)
						.filter(
							(member) =>
								!lineupPeople(snapshot).includes(member.id) &&
								(group === "combined" ||
									(plan.assignments?.find(
										(entry) => entry.personId === member.id,
									)?.ageGroup ??
										data.playerCoaching?.find(
											(entry) => entry.personId === member.id,
										)?.ageGroup ??
										(member.programs.includes("youth") ? "youth" : "adult")) ===
										group),
						)
						.map((member) => ({
							id: member.id,
							label: member.name,
							onSelect: (): void => onAdd(member.id, slot),
						}))
				: undefined,
			person: occupant ? person(occupant.personId) : undefined,
			substitutes: (snapshot.rotationSlots ?? [])
				.filter(
					(entry) =>
						entry.slot === slot &&
						(side === "black"
							? snapshot.blackBench
							: snapshot.whiteBench
						).includes(entry.personId) &&
						inGroup(entry.personId),
				)
				.map((entry) => person(entry.personId)),
		};
	});
	const rows: PoolBoardSpot[][] = [
		spots.filter(
			(_, slot) => formationPositions[formation].at(slot) === "FORWARD",
		),
		spots.filter((_, slot) =>
			["WING", "CENTER"].some(
				(position) => position === formationPositions[formation].at(slot),
			),
		),
		spots.filter(
			(_, slot) => formationPositions[formation].at(slot) === "FULL_BACK",
		),
	].filter((row) => row.length > 0);
	return (
		<Stack gap="xs" grow>
			<PoolBoard
				detail={<TeamStrength people={teamPeople} />}
				summary={
					<Row justify="between" gap="xs">
						<TeamCaptain
							dragScope={group}
							side={side}
							people={teamPeople}
							personId={captain?.personId}
							displayName={
								captain ? displayNames.get(captain.personId) : undefined
							}
							onChange={onCaptainChange}
						/>
						<LineupRoleMenu
							roleLabel="Ref"
							dragScope={group}
							label={`${side === "black" ? "Black" : "White"} referee`}
							people={data.members
								.filter(
									(member) =>
										teamPeople.includes(member.id) &&
										!member.archived &&
										!member.mergedInto &&
										member.programs.length > 0,
								)
								.map((member) => ({ id: member.id, name: member.name }))}
							personId={referee?.personId}
							displayName={
								referee
									? (displayNames.get(referee.personId) ??
										memberName(data, referee.personId).split(" ").at(0))
									: undefined
							}
							onChange={onRefereeChange}
						/>
					</Row>
				}
				key={formation}
				side={side}
				dragScope={group}
				label={
					onFormationChange
						? side === "black"
							? "Black"
							: "White"
						: `${side === "black" ? "Black" : "White"} · ${formation}`
				}
				headerAction={
					onFormationChange ? (
						<Row wrap>
							<Select
								label={`${side === "black" ? "Black" : "White"} formation`}
								hideLabel
								compact
								value={formation}
								options={formationOptions.map((option) => ({
									value: option.value,
									label: option.value,
								}))}
								onValueChange={(next): void => {
									if (next) onFormationChange(next);
								}}
							/>
						</Row>
					) : undefined
				}
				rows={rows}
				selectedPersonId={
					selectedPersonId && inGroup(selectedPersonId)
						? selectedPersonId
						: undefined
				}
				onAdd={
					onAdd
						? (id, slot): void => {
								if (inGroup(id)) onAdd(id, Number(slot));
							}
						: undefined
				}
				onSwap={
					onSwap
						? (id, other): void => {
								if (inGroup(id) && inGroup(other)) onSwap(id, other);
							}
						: undefined
				}
				onPlace={
					onPlace
						? (personId, slot): void => {
								if (inGroup(personId)) onPlace(personId, Number(slot));
							}
						: undefined
				}
			/>
		</Stack>
	);
};
