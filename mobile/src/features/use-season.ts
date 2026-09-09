import { atom, useAtom } from "jotai";
import { useApp } from "../demo/app-state";
import { clubDate } from "../domain/event-time";
import { defaultSeasonId } from "../domain/seasons";

const selectedSeason = atom<string>();
export const useSeason = (): [string, (value: string) => void] => {
	const { data } = useApp();
	const [selected, select] = useAtom(selectedSeason);
	const today = clubDate(undefined, data.timeZone);
	const season =
		data.seasons.find((season) => season.id === selected) ??
		data.seasons.find(
			(season) => season.start <= today && season.end >= today,
		) ??
		data.seasons.at(-1);
	return [season?.id ?? defaultSeasonId, select];
};
