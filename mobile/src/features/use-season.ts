import { atom, useAtom } from "jotai";
import { useApp } from "../demo/app-state";
import { clubDate } from "../domain/event-time";
import { defaultSeasonId } from "../domain/seasons";

const selectedSeason = atom<string>();
export const useSeason = (): [string, (value: string) => void] => {
	const { data } = useApp();
	const [selected, select] = useAtom(selectedSeason);
	const season =
		data.seasons.find((season) => season.id === selected) ??
		data.seasons.find(
			(season) => season.start <= clubDate() && season.end >= clubDate(),
		) ??
		data.seasons.at(-1);
	return [season?.id ?? defaultSeasonId, select];
};
