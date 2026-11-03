import { useMutation, usePaginatedQuery } from "convex/react";
import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewCoachingSchedule } from "../demo/coaching-schedule-state";
import {
	type CoachingPractice,
	type CoachOption,
	coachingHoursCorrectionError,
	completedCoachingEvent,
	practiceCoachingDuration,
	validCoachingDuration,
} from "../domain/coaching-hours";
import {
	automaticCoachingPractices,
	effectivePracticeCoaches,
} from "../domain/event-coaching";
import { previewCoachAssignments } from "./use-event-coaches";
import { useTask } from "./use-task";

export type HoursCorrection = (
	eventId: string,
	coachId: string,
	durationMinutes: number,
	expectedDurationMinutes: number,
) => Promise<boolean>;
type HoursResult = {
	correct: HoursCorrection;
	practices: CoachingPractice[];
	coaches: CoachOption[];
	loading: boolean;
};
export const useLiveCoachingHours = (seasonId: string): HoursResult => {
	const save = useMutation(api.coaching_hours.setCoach);
	const task = useTask();
	const {
		results: coaches,
		status: coachStatus,
		loadMore: loadMoreCoaches,
	} = usePaginatedQuery(
		api.coaching_hours.coaches,
		{},
		{ initialNumItems: 30 },
	);
	useEffect(() => {
		if (coachStatus === "CanLoadMore") loadMoreCoaches(30);
	}, [coachStatus, loadMoreCoaches]);
	const { results, status, loadMore } = usePaginatedQuery(
		api.coaching_hours.seasonPractices,
		{ seasonId },
		{ initialNumItems: 25 },
	);
	useEffect(() => {
		if (status === "CanLoadMore") loadMore(25);
	}, [status, loadMore]);
	return {
		correct: (
			eventId,
			coachId,
			durationMinutes,
			expectedDurationMinutes,
		): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				await save({
					eventId,
					coachId,
					durationMinutes,
					expectedDurationMinutes,
					assigned: true,
				});
			}),
		practices: results,
		coaches,
		loading: status !== "Exhausted" || coachStatus !== "Exhausted",
	};
};
export const usePreviewCoachingHours = (seasonId: string): HoursResult => {
	const { data, accounts, account } = useApp();
	const store = useStore();
	const task = useTask();
	const assignments = useAtomValue(previewCoachAssignments);
	const schedule = useAtomValue(previewCoachingSchedule);
	const coaches = accounts
		.filter((account) => account.coachPrograms.length > 0)
		.map((account) => ({
			coachId: account.id,
			personId: account.personId,
			name: account.name,
			programIds: account.coachPrograms,
		}));
	return {
		correct: (
			eventId,
			coachId,
			durationMinutes,
			expectedDurationMinutes,
		): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				const event = data.events.find((entry) => entry.id === eventId);
				if (
					(!account.admin && !account.coachPrograms.length) ||
					!event ||
					event.parts?.length ||
					!completedCoachingEvent(event, Date.now()) ||
					(!validCoachingDuration(durationMinutes) &&
						durationMinutes !== practiceCoachingDuration(event))
				)
					throw new Error(
						"Choose a valid completed practice and coaching time.",
					);
				const current = store.get(previewCoachAssignments);
				const resolved = effectivePracticeCoaches(
					event,
					store.get(previewCoachingSchedule),
					coaches,
					current[eventId],
				);
				const correctionError = coachingHoursCorrectionError(
					resolved,
					coachId,
					expectedDurationMinutes,
				);
				if (correctionError) throw new Error(correctionError);
				store.set(previewCoachAssignments, {
					...current,
					[eventId]: resolved.map((entry) =>
						entry.coachId === coachId ? { ...entry, durationMinutes } : entry,
					),
				});
			}),
		loading: false,
		coaches,
		practices: automaticCoachingPractices(
			data.events,
			schedule,
			coaches,
			assignments,
			seasonId,
			Date.now(),
		),
	};
};
