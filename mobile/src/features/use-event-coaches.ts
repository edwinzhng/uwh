import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import type { ClubEvent } from "../domain/app-types";
import {
	type CoachingAssignment,
	coachingPartIds,
	coachingPartMinutes,
	defaultCoachingDuration,
	resolvedCoachingAssignment,
	updatedCoachingPartIds,
	validCoachingDuration,
} from "../domain/coaching-hours";

export type CoachOption = { coachId: string; name: string; personId: string };
export type CoachChange = {
	coachId: string;
	assigned: boolean;
	durationMinutes?: number;
};
export type EventCoachControls = {
	coaches: CoachOption[];
	assignments: CoachingAssignment[];
	loading: boolean;
	busy: boolean;
	error?: string;
	change: (value: CoachChange) => Promise<boolean>;
};
export const previewCoachAssignments = atom<
	Record<string, CoachingAssignment[]>
>({});
export const useLiveEventCoaches = (
	eventId: string,
	partId?: string,
): EventCoachControls => {
	const assignments = useQuery(api.coaching_hours.eventCoaches, {
		eventId,
		partId,
	});
	const {
		results: coaches,
		status,
		loadMore,
	} = usePaginatedQuery(
		api.coaching_hours.coaches,
		{},
		{ initialNumItems: 30 },
	);
	const save = useMutation(api.coaching_hours.setCoach);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	useEffect(() => {
		if (status === "CanLoadMore") loadMore(30);
	}, [status, loadMore]);
	const change = async (value: CoachChange): Promise<boolean> => {
		setBusy(true);
		setError(undefined);
		try {
			await save({ eventId, partId, ...value });
			return true;
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Could not save coach hours.",
			);
			return false;
		} finally {
			setBusy(false);
		}
	};
	return {
		coaches,
		assignments: assignments ?? [],
		loading: !assignments || status !== "Exhausted",
		busy,
		error,
		change,
	};
};
export const usePreviewEventCoaches = (
	event: ClubEvent,
	partId?: string,
): EventCoachControls => {
	const { accounts } = useApp();
	const [stored, setStored] = useAtom(previewCoachAssignments);
	const coaches = accounts
		.filter((account) => account.coachPrograms.length > 0)
		.map((account) => ({
			coachId: account.id,
			personId: account.personId,
			name: account.name,
		}));
	const allAssignments = stored[event.id] ?? [];
	const assignments = allAssignments
		.filter(
			(assignment) =>
				!partId || coachingPartIds(event, assignment.partIds).includes(partId),
		)
		.map((assignment) => resolvedCoachingAssignment(event, assignment, partId))
		.filter((assignment) => assignment.durationMinutes > 0);
	const change = async (value: CoachChange): Promise<boolean> => {
		const coach = coaches.find((coach) => coach.coachId === value.coachId);
		const existing = allAssignments.find(
			(entry) => entry.coachId === value.coachId,
		);
		const partIds = updatedCoachingPartIds(
			event,
			existing,
			value.assigned,
			partId,
		);
		const assigned = partIds?.length !== 0;
		const durationMinutes = event.parts?.length
			? coachingPartMinutes(event, partIds)
			: (value.durationMinutes ??
				existing?.durationMinutes ??
				defaultCoachingDuration(event.date));
		if (
			event.cancelled ||
			(!event.parts?.length && !validCoachingDuration(durationMinutes)) ||
			(value.assigned && !coach)
		)
			return false;
		setStored((current) => ({
			...current,
			[event.id]: [
				...(current[event.id] ?? []).filter(
					(entry) => entry.coachId !== value.coachId,
				),
				...(assigned && coach
					? [{ ...coach, durationMinutes, ...(partIds ? { partIds } : {}) }]
					: []),
			],
		}));
		return true;
	};
	return { coaches, assignments, loading: false, busy: false, change };
};
