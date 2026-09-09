import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import type { ClubEvent } from "../domain/app-types";
import {
	type CoachingAssignment,
	defaultCoachingDuration,
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
	change: (value: CoachChange) => Promise<void>;
};
export const previewCoachAssignments = atom<
	Record<string, CoachingAssignment[]>
>({});
export const useLiveEventCoaches = (eventId: string): EventCoachControls => {
	const assignments = useQuery(api.coaching_hours.eventCoaches, { eventId });
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
	const change = async (value: CoachChange): Promise<void> => {
		setBusy(true);
		setError(undefined);
		try {
			await save({ eventId, ...value });
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Could not save coach hours.",
			);
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
	const assignments = stored[event.id] ?? [];
	const change = async (value: CoachChange): Promise<void> => {
		const coach = coaches.find((coach) => coach.coachId === value.coachId);
		const durationMinutes =
			value.durationMinutes ??
			assignments.find((entry) => entry.coachId === value.coachId)
				?.durationMinutes ??
			defaultCoachingDuration(event.date);
		if (
			event.cancelled ||
			!validCoachingDuration(durationMinutes) ||
			(value.assigned && !coach)
		)
			return;
		setStored((current) => ({
			...current,
			[event.id]: [
				...(current[event.id] ?? []).filter(
					(entry) => entry.coachId !== value.coachId,
				),
				...(value.assigned && coach ? [{ ...coach, durationMinutes }] : []),
			],
		}));
	};
	return { coaches, assignments, loading: false, busy: false, change };
};
