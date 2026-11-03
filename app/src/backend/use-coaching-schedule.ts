import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewCoachingSchedule } from "../demo/coaching-schedule-state";
import type { CoachOption } from "../domain/coaching-hours";
import {
	validateCoachingSchedule,
	validateProgramCoaching,
	type WeeklyCoachingSchedule,
} from "../domain/coaching-schedule";
import { clubPrograms } from "../domain/programs";

export type WeeklyCoachingState = {
	schedule?: WeeklyCoachingSchedule;
	coaches: CoachOption[];
	loading: boolean;
	save: (schedule: WeeklyCoachingSchedule) => Promise<void>;
};
export const useLiveCoachingSchedule = (): WeeklyCoachingState => {
	const schedule = useQuery(api.coaching_schedule.current, {});
	const {
		results: coaches,
		status,
		loadMore,
	} = usePaginatedQuery(
		api.coaching_hours.coaches,
		{},
		{ initialNumItems: 30 },
	);
	const save = useMutation(api.coaching_schedule.save);
	useEffect(() => {
		if (status === "CanLoadMore") loadMore(30);
	}, [status, loadMore]);
	return {
		schedule,
		coaches,
		loading: !schedule || status !== "Exhausted",
		save: async (next): Promise<void> => {
			await save(next);
		},
	};
};
export const usePreviewCoachingSchedule = (): WeeklyCoachingState => {
	const { accounts, account, data } = useApp();
	const [schedule, setSchedule] = useAtom(previewCoachingSchedule);
	const coaches = accounts
		.filter((entry) => entry.coachPrograms.length)
		.map((entry) => ({
			coachId: entry.id,
			personId: entry.personId,
			name: entry.name,
			programIds: entry.coachPrograms,
		}));
	return {
		schedule,
		coaches,
		loading: false,
		save: async (next): Promise<void> => {
			if (!account.admin && !account.coachPrograms.length)
				throw new Error("Coach or admin access required.");
			const error = validateCoachingSchedule(next);
			if (error) throw new Error(error);
			if (next.revision !== schedule.revision)
				throw new Error(
					"Coach assignments changed. Reopen them before saving.",
				);
			const accessError = validateProgramCoaching(
				schedule,
				next,
				account,
				clubPrograms(data),
				coaches,
			);
			if (accessError) throw new Error(accessError);
			setSchedule({ ...next, revision: next.revision + 1 });
		},
	};
};
