import { atom, useAtom } from "jotai";

const draftsAtom = atom<Record<string, string>>({});
export const useDraft = (key: string): [string, (value: string) => void] => {
	const [drafts, setDrafts] = useAtom(draftsAtom);
	return [
		drafts[key] ?? "",
		(value): void => setDrafts((current) => ({ ...current, [key]: value })),
	];
};
