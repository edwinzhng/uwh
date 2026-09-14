import { useEffect, useState } from "react";
import { useApp } from "../demo/app-state";
import { clubDate } from "../domain/event-time";

export const useClubToday = (): string => {
	const { data } = useApp();
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = setInterval((): void => setNow(Date.now()), 60000);
		return (): void => clearInterval(timer);
	}, []);
	return clubDate(now, data.timeZone);
};
