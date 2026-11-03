import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewCoachingSchedule } from "../demo/coaching-schedule-state";
import type { ClubEvent } from "../domain/app-types";
import {
	type CoachingAssignment,
	type CoachOption,
	canAssignPracticeCoach,
	coachingPartIds,
	coachingPartMinutes,
	maxPracticeCoaches,
	practiceCoachingDuration,
	resolvedCoachingAssignment,
	updatedCoachingPartIds,
	validCoachingDuration,
} from "../domain/coaching-hours";
import { programCoachesFor } from "../domain/coaching-schedule";
import { useTask } from "./use-task";

export type CoachChange = {
	coachId: string;
	assigned: boolean;
	durationMinutes?: number;
};
export type EventCoachControls = {
	coaches: CoachOption[];
	assignments: CoachingAssignment[];
	usingWeekly: boolean;
	backupCoachIds: string[];
	loading: boolean;
	busy: boolean;
	error?: string;
	change: (value: CoachChange) => Promise<boolean>;
	confirm: () => Promise<boolean>;
	useWeekly: () => Promise<boolean>;
};
export const previewCoachAssignments = atom<
	Record<string, CoachingAssignment[]>
>({});
export const useLiveEventCoaches = (
	eventId: string,
	partId?: string,
): EventCoachControls => {
	const state = useQuery(api.coaching_schedule.eventState, {
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
	const confirm = useMutation(api.coaching_schedule.confirmEvent);
	const resetEvent = useMutation(api.coaching_schedule.useWeeklyForEvent);
	const task = useTask();
	useEffect(() => {
		if (status === "CanLoadMore") loadMore(30);
	}, [status, loadMore]);
	const change = (value: CoachChange): Promise<boolean> =>
		task.run(async (): Promise<void> => {
			await save({ eventId, partId, ...value });
		});
	return {
		coaches,
		assignments: state?.assignments ?? [],
		usingWeekly: state?.usingWeekly ?? false,
		backupCoachIds: state?.backupCoachIds ?? [],
		loading: !state || status !== "Exhausted",
		busy: task.busy,
		error: task.error,
		change,
		confirm: (): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				await confirm({ eventId });
			}),
		useWeekly: (): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				await resetEvent({ eventId });
			}),
	};
};
export const usePreviewEventCoaches = (
	event: ClubEvent,
	partId?: string,
): EventCoachControls => {
	const { accounts } = useApp();
	const [stored, setStored] = useAtom(previewCoachAssignments);
	const [schedule] = useAtom(previewCoachingSchedule);
	const coaches = accounts
		.filter((account) => account.coachPrograms.length > 0)
		.map((account) => ({
			coachId: account.id,
			personId: account.personId,
			name: account.name,
		}));
	const usingWeekly =
		Object.getOwnPropertyDescriptor(stored, event.id) === undefined;
	const allAssignments: CoachingAssignment[] =
		stored[event.id] ??
		programCoachesFor(schedule, event.program).flatMap((id) => {
			const coach = coaches.find(
				(entry) =>
					entry.coachId === id &&
					accounts.some(
						(account) =>
							account.id === id &&
							account.coachPrograms.includes(event.program),
					),
			);
			return coach
				? [
						{
							...coach,
							durationMinutes: event.parts?.length
								? coachingPartMinutes(event)
								: practiceCoachingDuration(event),
						},
					]
				: [];
		});
	const assignments = allAssignments
		.filter(
			(assignment) =>
				!partId || coachingPartIds(event, assignment.partIds).includes(partId),
		)
		.map((assignment) => resolvedCoachingAssignment(event, assignment, partId))
		.filter((assignment) => assignment.durationMinutes > 0);
	const change = async (value: CoachChange): Promise<boolean> => {
		if (
			value.assigned &&
			!canAssignPracticeCoach(allAssignments, value.coachId)
		)
			return false;
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
				practiceCoachingDuration(event));
		if (
			event.cancelled ||
			(!event.parts?.length &&
				!validCoachingDuration(durationMinutes) &&
				durationMinutes !== practiceCoachingDuration(event)) ||
			(value.assigned && !coach)
		)
			return false;
		setStored((current) => ({
			...current,
			[event.id]: [
				...allAssignments.filter((entry) => entry.coachId !== value.coachId),
				...(assigned && coach
					? [{ ...coach, durationMinutes, ...(partIds ? { partIds } : {}) }]
					: []),
			],
		}));
		return true;
	};
	return {
		coaches,
		assignments,
		usingWeekly,
		backupCoachIds: schedule.backupCoachIds,
		loading: false,
		busy: false,
		change,
		confirm: async (): Promise<boolean> => {
			if (event.cancelled || allAssignments.length > maxPracticeCoaches)
				return false;
			setStored((current) => ({ ...current, [event.id]: allAssignments }));
			return true;
		},
		useWeekly: async (): Promise<boolean> => {
			if (event.cancelled) return false;
			setStored((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([id]) => id !== event.id),
				),
			);
			return true;
		},
	};
};
