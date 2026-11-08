import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, LineupPreview } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	formationPositions,
	lineupPeople,
	lineupSlotAbbreviation,
	lineupSnapshot,
} from "../domain/lineup";
import { lineupDisplayNames } from "../domain/lineup-display-name";
import {
	lineupPlayerGroup,
	lineupVisibleGroups,
	lineupVisibleSides,
} from "../domain/lineup-visible-sides";

export const TeamLineupPreview = ({
	plan,
	playerPersonId,
}: {
	plan: TeamPlan;
	playerPersonId?: string;
}): ReactElement => {
	const { data } = useApp();
	const sides = lineupVisibleSides(plan, playerPersonId);
	const groups = lineupVisibleGroups(plan, data, playerPersonId);
	if (!groups.length)
		return (
			<EmptyState
				title={
					playerPersonId
						? "You are not assigned to a team for this practice."
						: "No team assignments"
				}
			/>
		);
	const snapshot = lineupSnapshot(plan);
	const names = lineupDisplayNames(
		[
			...lineupPeople(snapshot),
			...(plan.referees ?? []).map((entry) => entry.personId),
		].map((id) => ({ id, name: memberName(data, id) })),
	);
	const person = (
		personId: string,
	): { personId: string; name: string; displayName: string } => {
		const name = memberName(data, personId);
		return { personId, name, displayName: names.get(personId) ?? name };
	};
	return (
		<LineupPreview
			groups={groups.map((group) => {
				const inGroup = (id: string): boolean =>
					group === "combined" || lineupPlayerGroup(plan, data, id) === group;
				return {
					label:
						group === "combined"
							? undefined
							: group === "adult"
								? "Adults"
								: "Youth",
					teams: sides.map((side) => {
						const formation =
							side === "black"
								? snapshot.blackFormation
								: snapshot.whiteFormation;
						const reserves =
							side === "black" ? snapshot.blackBench : snapshot.whiteBench;
						const rotations = (snapshot.rotationSlots ?? []).filter(
							(entry) =>
								reserves.includes(entry.personId) && inGroup(entry.personId),
						);
						const spots = formationPositions[formation].map(
							(position, slot) => {
								const occupant = snapshot.fieldSlots?.find(
									(entry) =>
										entry.slot === slot &&
										snapshot[side].includes(entry.personId) &&
										inGroup(entry.personId),
								);
								return {
									position,
									positionLabel: lineupSlotAbbreviation(formation, slot),
									id: `${group}:${side}:${slot}`,
									person: occupant ? person(occupant.personId) : undefined,
									substitutes: rotations
										.filter((entry) => entry.slot === slot)
										.map((entry) => person(entry.personId)),
								};
							},
						);
						return {
							label: side === "black" ? "Black" : "White",
							formation,
							side,
							reserves: reserves
								.filter(
									(id) =>
										inGroup(id) &&
										!rotations.some((entry) => entry.personId === id),
								)
								.map(person),
							roles: [
								...(plan.captains ?? [])
									.filter(
										(entry) => entry.side === side && inGroup(entry.personId),
									)
									.map((entry) => ({
										...person(entry.personId),
										role:
											entry.role === "vice"
												? ("Vice Captain" as const)
												: ("Captain" as const),
									})),
								...(plan.referees ?? [])
									.filter(
										(entry) => entry.side === side && inGroup(entry.personId),
									)
									.map((entry) => ({
										...person(entry.personId),
										role:
											entry.role === "second"
												? ("2nd Ref" as const)
												: ("Ref" as const),
									})),
							],
							rows: [
								spots.filter((spot) => spot.position === "FORWARD"),
								spots.filter(
									(spot) =>
										spot.position === "WING" || spot.position === "CENTER",
								),
								spots.filter((spot) => spot.position === "FULL_BACK"),
							].filter((row) => row.length > 0),
						};
					}),
				};
			})}
		/>
	);
};
