import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	LineupRoleMenu,
	PoolBoard,
	type PoolBoardSpot,
	Row,
	Select,
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
	onViceCaptainChange,
	onRefereeChange,
	onSecondRefereeChange,
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
	onViceCaptainChange?: (personId?: string) => void;
	onRefereeChange?: (personId?: string) => void;
	onSecondRefereeChange?: (personId?: string) => void;
}): ReactElement => {
	const { data } = useApp();
	const snapshot = lineupSnapshot(plan);
	const formation =
		side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const inGroup = (id: string): boolean =>
		group === "combined" ||
		(plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
			data.playerCoaching?.find((entry) => entry.personId === id)?.ageGroup ??
			(data.members
				.find((member) => member.id === id)
				?.programs.includes("youth")
				? "youth"
				: "adult")) === group;
	const displayNames = lineupDisplayNames(
		[
			...lineupPeople(snapshot).filter(inGroup),
			...(plan.referees ?? []).map((referee) => referee.personId),
		].map((id) => ({ id, name: memberName(data, id) })),
	);
	const captain = plan.captains?.find(
		(entry) => entry.side === side && !entry.role && inGroup(entry.personId),
	);
	const viceCaptain = plan.captains?.find(
		(entry) =>
			entry.side === side && entry.role === "vice" && inGroup(entry.personId),
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
	const referee = plan.referees?.find(
		(entry) => entry.side === side && !entry.role,
	);
	const secondReferee = plan.referees?.find(
		(entry) => entry.side === side && entry.role === "second",
	);
	const showCaptainRoles = Boolean(
		captain || viceCaptain || onCaptainChange || onViceCaptainChange,
	);
	const showReferee = Boolean(referee || onRefereeChange);
	const showSecondReferee = Boolean(secondReferee || onSecondRefereeChange);
	const showRefereeRoles = showReferee || showSecondReferee;
	const rolePeople = data.members
		.filter(
			(member) =>
				teamPeople.includes(member.id) &&
				!member.archived &&
				!member.mergedInto &&
				member.programs.length > 0,
		)
		.map((member) => ({ id: member.id, name: member.name }));
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
		<PoolBoard
			detail={<TeamStrength people={teamPeople} />}
			summary={
				showCaptainRoles || showRefereeRoles ? (
					<Row
						justify={showCaptainRoles ? "between" : "end"}
						gap="xs"
						align="start"
						wrap
					>
						{showCaptainRoles ? (
							<Row gap="xs" align="start">
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
								<TeamCaptain
									roleLabel="Vice Captain"
									dragScope={group}
									side={side}
									people={teamPeople}
									personId={viceCaptain?.personId}
									displayName={
										viceCaptain
											? displayNames.get(viceCaptain.personId)
											: undefined
									}
									onChange={onViceCaptainChange}
								/>
							</Row>
						) : undefined}
						{showRefereeRoles ? (
							<Row gap="xs" align="start">
								{showReferee ? (
									<LineupRoleMenu
										roleLabel="Ref"
										dragScope={group}
										label={`${side === "black" ? "Black" : "White"} referee`}
										people={rolePeople}
										personId={referee?.personId}
										displayName={
											referee ? displayNames.get(referee.personId) : undefined
										}
										onChange={onRefereeChange}
									/>
								) : undefined}
								{showSecondReferee ? (
									<LineupRoleMenu
										roleLabel="2nd Ref"
										dragScope={group}
										label={`${side === "black" ? "Black" : "White"} second referee`}
										people={rolePeople}
										personId={secondReferee?.personId}
										displayName={
											secondReferee
												? displayNames.get(secondReferee.personId)
												: undefined
										}
										onChange={onSecondRefereeChange}
									/>
								) : undefined}
							</Row>
						) : undefined}
					</Row>
				) : undefined
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
	);
};
