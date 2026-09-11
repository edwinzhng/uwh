import type { EventDraft } from "./app-types";

const timeMinutes = (value: string): number => {
	const [hours, minutes] = value.split(":").map(Number);
	return (hours ?? 0) * 60 + (minutes ?? 0);
};

const clockTime = (minutes: number): string =>
	`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const toggleEventParts = (
	draft: EventDraft,
	enabled: boolean,
): EventDraft => {
	if (!enabled) return { ...draft, parts: undefined };
	if (draft.parts?.length) return draft;
	const start = timeMinutes(draft.start);
	const end = timeMinutes(draft.end);
	const split = clockTime(
		Math.max(
			start + 1,
			Math.min(
				end - 1,
				start + 45,
				start + Math.round((end - start) / 30) * 15,
			),
		),
	);
	return {
		...draft,
		kind: "training",
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: draft.start,
				end: split,
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: split,
				end: draft.end,
			},
		],
	};
};

export const updateEventPartTime = (
	draft: EventDraft,
	partId: string,
	boundary: "start" | "end",
	value: string,
): EventDraft => {
	const original = draft.parts?.find((part) => part.id === partId);
	if (!original || !draft.parts) return draft;
	const index = draft.parts.findIndex((part) => part.id === partId);
	const parts = draft.parts.map((part, partIndex) =>
		part.id === partId
			? { ...part, [boundary]: value }
			: boundary === "end" &&
					partIndex === index + 1 &&
					part.start === original.end
				? { ...part, start: value }
				: boundary === "start" &&
						partIndex === index - 1 &&
						part.end === original.start
					? { ...part, end: value }
					: part,
	);
	return {
		...draft,
		parts,
		start: parts.at(0)?.start ?? draft.start,
		end: parts.at(-1)?.end ?? draft.end,
	};
};

export const appendEventPart = (draft: EventDraft, id: string): EventDraft => {
	if (!draft.parts?.length) return toggleEventParts(draft, true);
	const last = draft.parts.at(-1);
	if (!last) return draft;
	const startMinutes = timeMinutes(last.start);
	const endMinutes = timeMinutes(last.end);
	const split = clockTime(Math.floor((startMinutes + endMinutes) / 2));
	return {
		...draft,
		parts: [
			...draft.parts.map((part) =>
				part.id === last.id ? { ...part, end: split } : part,
			),
			{
				id,
				title:
					Array.from({ length: 13 }, (_, index) => `Section ${index + 1}`).find(
						(title) => !draft.parts?.some((part) => part.title === title),
					) ?? "New section",
				kind: "training",
				start: split,
				end: last.end,
			},
		],
	};
};
