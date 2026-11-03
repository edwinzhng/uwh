import { atom, useAtom, type WritableAtom } from "jotai";
import { useMemo } from "react";

const draftsAtom = atom<Record<string, string>>({});
export const createDraftAtom = (
	key: string,
): WritableAtom<string, [string], void> =>
	atom(
		(get): string => get(draftsAtom)[key] ?? "",
		(_get, set, value: string): void =>
			set(draftsAtom, (previous) =>
				previous[key] === value ? previous : { ...previous, [key]: value },
			),
	);
export const useDraft = (key: string): [string, (value: string) => void] => {
	const draft = useMemo(() => createDraftAtom(key), [key]);
	return useAtom(draft);
};
