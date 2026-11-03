import { atom } from "jotai";
import {
	emptyCoachingSchedule,
	type WeeklyCoachingSchedule,
} from "../domain/coaching-schedule";

export const previewCoachingSchedule = atom<WeeklyCoachingSchedule>({
	...emptyCoachingSchedule(),
	programs: [{ programId: "club", coachIds: ["alex"] }],
	days: emptyCoachingSchedule().days.map((day) => ({
		...day,
		coachIds:
			day.weekday === "monday" || day.weekday === "friday" ? ["alex"] : [],
	})),
	backupCoachIds: ["casey"],
});
