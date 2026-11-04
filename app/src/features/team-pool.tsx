import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Avatar,
	PoolBoard,
	type PoolBoardSpot,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamFormation, TeamPlan } from "../domain/app-types";
import {
	formationOptions,
	formationPositions,
	type LineupSide,
	lineupSlotLabel,
	lineupSnapshot,
	lineupTeamPeople,
} from "../domain/lineup";
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
	onManageRotation,
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
	onManageRotation?: (slot: number, label: string) => void;
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
	const captain = plan.captains?.find(
		(entry) => entry.side === side && inGroup(entry.personId),
	);
	const person = (
		id: string,
	): { id: string; name: string; captain: boolean } => ({
		id,
		name: memberName(data, id),
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
		<Stack gap="sm">
			<PoolBoard
				summary={
					<Row justify="between" wrap>
						<TeamStrength people={teamPeople} />
						<Row wrap>
							<TeamCaptain
								side={side}
								people={teamPeople}
								personId={captain?.personId}
								onChange={onCaptainChange}
							/>
							{onRefereeChange ? (
								<Select
									hideLabel
									compact
									label={`${side === "black" ? "Black" : "White"} referee`}
									value={referee?.personId ?? "none"}
									options={[
										{ value: "none", label: "Set ref" },
										...data.members
											.filter(
												(member) =>
													!member.archived &&
													!member.mergedInto &&
													member.programs.length > 0,
											)
											.map((member) => ({
												value: member.id,
												label: member.name,
												person: { id: member.id, name: member.name },
											})),
									]}
									onValueChange={(id): void => {
										if (id) onRefereeChange(id === "none" ? undefined : id);
									}}
								/>
							) : undefined}
						</Row>
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
				onManageRotation={
					onManageRotation
						? (slot, label): void => onManageRotation(Number(slot), label)
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
			{referee ? (
				<Row>
					<Avatar
						name={memberName(data, referee.personId)}
						personId={referee.personId}
					/>
					<Text variant="small">
						Referee · {memberName(data, referee.personId)}
					</Text>
				</Row>
			) : undefined}
		</Stack>
	);
};
