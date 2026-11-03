import type { Message } from "./app-types";
import { defaultClubTimeZone } from "./time-zones";

export type PollDraft = {
	question: string;
	options: string[];
	multiple: boolean;
	closesAt?: number;
};
export type ChatPoll = PollDraft & {
	messageId?: string;
	id: string;
	threadId: string;
	author: string;
	createdBy: string;
	closed: boolean;
	selected: number[];
	counts?: number[];
	voters?: number;
	canClose: boolean;
};
export type PreviewPoll = PollDraft & {
	messageId?: string;
	createdAt?: number;
	id: string;
	threadId: string;
	author: string;
	createdBy: string;
	closedAt?: number;
	votes: Record<string, number[]>;
};
export type ThreadTools = {
	polls: ChatPoll[];
	pins: Message[];
	canPin: boolean;
};
export const normalizePollDraft = (draft: PollDraft): PollDraft => ({
	question: draft.question.trim(),
	options: draft.options.map((option) => option.trim()),
	multiple: draft.multiple,
	closesAt: draft.closesAt,
});
export const samePollDraft = (first: PollDraft, second: PollDraft): boolean =>
	first.question.trim() === second.question.trim() &&
	JSON.stringify(first.options.map((option) => option.trim())) ===
		JSON.stringify(second.options.map((option) => option.trim())) &&
	first.multiple === second.multiple &&
	first.closesAt === second.closesAt;
export const validatePoll = (
	draft: PollDraft,
	now = Date.now(),
): string | undefined => {
	if (!draft.question.trim() || draft.question.trim().length > 300)
		return !draft.question.trim()
			? "Add a question"
			: "Use 300 characters or fewer";
	if (draft.options.length < 2 || draft.options.length > 6)
		return "Add 2–6 answers";
	if (
		draft.options.some((option) => !option.trim() || option.trim().length > 120)
	)
		return "Add each answer using 120 characters or fewer";
	if (
		new Set(draft.options.map((option) => option.trim().toLocaleLowerCase()))
			.size !== draft.options.length
	)
		return "Use different answers";
	if (
		draft.closesAt !== undefined &&
		(!Number.isFinite(draft.closesAt) || draft.closesAt <= now)
	)
		return "Choose a future closing time";
	return undefined;
};
export const validateVote = (
	poll: Pick<PollDraft, "options" | "multiple" | "closesAt"> & {
		closedAt?: number;
	},
	choices: number[],
	now = Date.now(),
): string | undefined => {
	if (poll.closedAt || (poll.closesAt !== undefined && now >= poll.closesAt))
		return "Poll closed";
	if (!choices.length || (!poll.multiple && choices.length !== 1))
		return poll.multiple ? "Choose at least one answer" : "Choose one answer";
	if (
		new Set(choices).size !== choices.length ||
		choices.some(
			(choice) =>
				!Number.isInteger(choice) ||
				choice < 0 ||
				choice >= poll.options.length,
		)
	)
		return "Choose a listed answer";
	return undefined;
};
export const pollMessageId = (pollId: string): string => `poll-${pollId}`;
export const pollMessageTime = (
	createdAt: number,
	timeZone = defaultClubTimeZone,
): string =>
	new Intl.DateTimeFormat("en-CA", {
		hour: "numeric",
		minute: "2-digit",
		timeZone,
	}).format(createdAt);
export const updatedPollCounts = (
	counts: number[],
	previous: number[],
	choices: number[],
): number[] =>
	counts.map(
		(count, index) =>
			count -
			Number(previous.includes(index)) +
			Number(choices.includes(index)),
	);
export const summarizePollCounts = (
	poll: Omit<PreviewPoll, "votes">,
	accountId: string,
	staff: boolean,
	selected: number[],
	counts: number[],
	voters: number,
	now = Date.now(),
): ChatPoll => {
	const closed = Boolean(
		poll.closedAt || (poll.closesAt !== undefined && now >= poll.closesAt),
	);
	const resultsVisible =
		closed || selected.length > 0 || poll.createdBy === accountId;
	return {
		id: poll.id,
		messageId: poll.messageId,
		threadId: poll.threadId,
		question: poll.question,
		options: poll.options,
		multiple: poll.multiple,
		closesAt: poll.closesAt,
		author: poll.author,
		createdBy: poll.createdBy,
		closed,
		selected,
		counts: resultsVisible ? counts : undefined,
		voters: resultsVisible ? voters : undefined,
		canClose: !closed && (staff || poll.createdBy === accountId),
	};
};
export const summarizePoll = (
	poll: PreviewPoll,
	accountId: string,
	staff: boolean,
	now = Date.now(),
): ChatPoll =>
	summarizePollCounts(
		poll,
		accountId,
		staff,
		poll.votes[accountId] ?? [],
		poll.options.map(
			(_, index) =>
				Object.values(poll.votes).filter((choices) => choices.includes(index))
					.length,
		),
		Object.keys(poll.votes).length,
		now,
	);
