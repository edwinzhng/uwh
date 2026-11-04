import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { LineupPreview } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import { formationPositions, lineupSnapshot } from "../domain/lineup";

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
			teams={groups.flatMap((group) =>
				(["black", "white"] as const).map((side) => {
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
							position,
							id: `${group}:${side}:${slot}`,
							name: personId
								? (memberName(data, personId).split(" ").at(0) ??
									memberName(data, personId))
								: "—",
						};
					});
					return {
						label: `${side === "black" ? "Black" : "White"}${group === "combined" ? "" : group === "adult" ? " · Adults" : " · Youth"}`,
						formation,
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
			)}
		/>
	);
};
