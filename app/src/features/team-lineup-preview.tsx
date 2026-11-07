import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { LineupPreview } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	formationPositions,
	lineupSlotAbbreviation,
	lineupSnapshot,
} from "../domain/lineup";

export const TeamLineupPreview = ({
	plan,
}: {
	plan: TeamPlan;
}): ReactElement => {
	const { data } = useApp();
	const snapshot = lineupSnapshot(plan);
	const groups = plan.separateYouth ? ["adult", "youth"] : ["combined"];
	return (
		<LineupPreview
			groups={groups.map((group) => ({
				label:
					group === "combined"
						? undefined
						: group === "adult"
							? "Adults"
							: "Youth",
				teams: (["black", "white"] as const).map((side) => {
					const formation =
						side === "black"
							? snapshot.blackFormation
							: snapshot.whiteFormation;
					const spots = formationPositions[formation].map((position, slot) => {
						const personId = snapshot.fieldSlots?.find(
							(entry) =>
								entry.slot === slot &&
								snapshot[side].includes(entry.personId) &&
								(group === "combined" ||
									(plan.assignments?.find(
										(assignment) => assignment.personId === entry.personId,
									)?.ageGroup ?? "adult") === group),
						)?.personId;
						return {
							personId,
							substitutes: (snapshot.rotationSlots ?? [])
								.filter(
									(entry) =>
										entry.slot === slot &&
										(side === "black"
											? snapshot.blackBench
											: snapshot.whiteBench
										).includes(entry.personId) &&
										(group === "combined" ||
											(plan.assignments?.find(
												(assignment) => assignment.personId === entry.personId,
											)?.ageGroup ?? "adult") === group),
								)
								.map((entry) => ({
									personId: entry.personId,
									name: memberName(data, entry.personId),
								})),
							position,
							positionLabel: lineupSlotAbbreviation(formation, slot),
							id: `${group}:${side}:${slot}`,
							name: personId ? memberName(data, personId) : "—",
						};
					});
					return {
						label: side === "black" ? "Black" : "White",
						formation,
						side,
						roles: [
							...(plan.captains ?? [])
								.filter(
									(entry) =>
										entry.side === side &&
										(group === "combined" ||
											(plan.assignments?.find(
												(assignment) => assignment.personId === entry.personId,
											)?.ageGroup ?? "adult") === group),
								)
								.map((entry) => ({
									personId: entry.personId,
									name: memberName(data, entry.personId),
									role:
										entry.role === "vice"
											? ("Vice Captain" as const)
											: ("Captain" as const),
								})),
							...(plan.referees ?? [])
								.filter((entry) => entry.side === side)
								.map((entry) => ({
									personId: entry.personId,
									name: memberName(data, entry.personId),
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
			}))}
		/>
	);
};
