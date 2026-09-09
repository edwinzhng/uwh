import { usePaginatedQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	type CoachingPractice,
	completedCoachingEvent,
} from "../domain/coaching-hours";
import { defaultSeasonId } from "../domain/seasons";
import { previewCoachAssignments } from "./use-event-coaches";

type HoursResult = { practices: CoachingPractice[]; loading: boolean };
export const useLiveCoachingHours = (seasonId: string): HoursResult => {
	const { results, status, loadMore } = usePaginatedQuery(
		api.coaching_hours.seasonPractices,
		{ seasonId },
		{ initialNumItems: 25 },
	);
	useEffect(() => {
		if (status === "CanLoadMore") loadMore(25);
	}, [status, loadMore]);
	return { practices: results, loading: status !== "Exhausted" };
};
export const usePreviewCoachingHours = (seasonId: string): HoursResult => {
	const { data } = useApp();
	const assignments = useAtomValue(previewCoachAssignments);
	return {
		loading: false,
		practices: data.events
			.filter(
				(event) =>
					(event.seasonId ?? defaultSeasonId) === seasonId &&
					completedCoachingEvent(event, Date.now()),
			)
			.map((event) => ({
				eventId: event.id,
				title: event.title,
				date: event.date,
				start: event.start,
				coaches: assignments[event.id] ?? [],
			}))
			.filter((event) => event.coaches.length > 0)
			.sort(
				(left, right) =>
					right.date.localeCompare(left.date) ||
					right.start.localeCompare(left.start),
			),
	};
};
