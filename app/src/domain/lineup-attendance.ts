import type { TeamPlan } from "./app-types";
import { lineupPeople, lineupSnapshot, saveLineupDraft } from "./lineup";

export const reconcileLineupAttendance = (
	plan: TeamPlan,
	attendees: string[],
	expectedRevision: number,
): TeamPlan => {
	if (plan.coachingStale)
		throw new Error("Player details changed. Regenerate teams before editing.");
	if (expectedRevision !== (plan.revision ?? 0))
		throw new Error("This lineup changed. Reopen it before saving or undoing.");
	const present = new Set(attendees);
	const previous = plan.draftLineup ?? lineupSnapshot(plan);
	const included = lineupPeople(previous).filter((id) => present.has(id));
	const excluded = attendees.filter((id) => !included.includes(id));
	const groupFor = (personId: string): string =>
		plan.separateYouth
			? (previous.positions.find((entry) => entry.personId === personId)
					?.ageGroup ??
				plan.assignments?.find((entry) => entry.personId === personId)
					?.ageGroup ??
				"adult")
			: "combined";
	const retained = {
		...previous,
		excludedPersonIds: excluded,
		black: previous.black.filter((id) => present.has(id)),
		white: previous.white.filter((id) => present.has(id)),
		blackBench: previous.blackBench.filter((id) => present.has(id)),
		whiteBench: previous.whiteBench.filter((id) => present.has(id)),
		positions: previous.positions.filter((entry) =>
			present.has(entry.personId),
		),
		fieldSlots: previous.fieldSlots?.filter((entry) =>
			present.has(entry.personId),
		),
		rotationSlots: previous.rotationSlots?.filter((entry) =>
			present.has(entry.personId),
		),
		captains: previous.captains?.filter((entry) => present.has(entry.personId)),
		referees: previous.referees?.filter((entry) => present.has(entry.personId)),
	};
	const snapshot = (previous.fieldSlots ?? [])
		.filter((entry) => !present.has(entry.personId))
		.reduce((current, departed) => {
			const side = previous.black.includes(departed.personId)
				? "black"
				: "white";
			const bench = side === "black" ? "blackBench" : "whiteBench";
			const group = groupFor(departed.personId);
			const replacement = current.rotationSlots?.find(
				(entry) =>
					entry.slot === departed.slot &&
					current[bench].includes(entry.personId) &&
					groupFor(entry.personId) === group,
			);
			return replacement
				? {
						...current,
						[side]: [...current[side], replacement.personId],
						[bench]: current[bench].filter((id) => id !== replacement.personId),
						fieldSlots: [...(current.fieldSlots ?? []), replacement],
						rotationSlots: current.rotationSlots?.filter(
							(entry) => entry.personId !== replacement.personId,
						),
					}
				: current;
		}, retained);
	return saveLineupDraft(
		{ ...plan, attendees, excludedPersonIds: excluded },
		snapshot,
		expectedRevision,
	);
};
