import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { atom, useAtom, useStore } from "jotai";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewCoachingSchedule } from "../demo/coaching-schedule-state";
import type { ClubEvent } from "../domain/app-types";
import {
	type CoachingAssignment,
	type CoachOption,
	canAssignPracticeCoach,
	coachingPartMinutes,
	practiceCoachingDuration,
	updatedCoachingPartIds,
	validCoachingDuration,
} from "../domain/coaching-hours";
import { effectivePracticeCoaches } from "../domain/event-coaching";
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
	};
};
export const usePreviewEventCoaches = (
	event: ClubEvent,
	partId?: string,
): EventCoachControls => {
	const { accounts, account } = useApp();
	const store = useStore();
	const task = useTask();
	const [stored] = useAtom(previewCoachAssignments);
	const [schedule] = useAtom(previewCoachingSchedule);
	const coaches = accounts
		.filter((entry) => entry.coachPrograms.length > 0)
		.map((entry) => ({
			coachId: entry.id,
			personId: entry.personId,
			name: entry.name,
			programIds: entry.coachPrograms,
		}));
	const change = (value: CoachChange): Promise<boolean> =>
		task.run(async (): Promise<void> => {
			if (!account.admin && !account.coachPrograms.length)
				throw new Error("Coach or admin access required.");
			const current = store.get(previewCoachAssignments);
			const allAssignments = effectivePracticeCoaches(
				event,
				store.get(previewCoachingSchedule),
				coaches,
				current[event.id],
			);
			if (
				value.assigned &&
				!canAssignPracticeCoach(allAssignments, value.coachId)
			)
				throw new Error("A practice can have at most 3 coaches.");
			const coach = coaches.find((entry) => entry.coachId === value.coachId);
			const existing = allAssignments.find(
				(entry) => entry.coachId === value.coachId,
			);
			const partIds = updatedCoachingPartIds(
				event,
				existing,
				value.assigned,
				partId,
			);
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
				(value.assigned && !coach) ||
				(event.parts?.length && value.durationMinutes !== undefined)
			)
				throw new Error("Choose a valid coach and coaching time.");
			store.set(previewCoachAssignments, {
				...current,
				[event.id]: [
					...allAssignments.filter((entry) => entry.coachId !== value.coachId),
					...(partIds?.length !== 0 && coach
						? [
								{
									coachId: coach.coachId,
									personId: coach.personId,
									name: coach.name,
									durationMinutes,
									...(partIds ? { partIds } : {}),
								},
							]
						: []),
				],
			});
		});
	return {
		coaches,
		assignments: effectivePracticeCoaches(
			event,
			schedule,
			coaches,
			stored[event.id],
			partId,
		),
		usingWeekly: stored[event.id] === undefined,
		backupCoachIds: schedule.backupCoachIds,
		loading: false,
		busy: task.busy,
		error: task.error,
		change,
	};
};
