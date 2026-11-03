import { pollMessageTime } from "./chat-polls";
import type { ThreadMessage } from "./messaging";
import { defaultClubTimeZone } from "./time-zones";

const formatters = new Map<
	string,
	{
		day: Intl.DateTimeFormat;
		time: Intl.DateTimeFormat;
		date: Intl.DateTimeFormat;
	}
>();
const chatFormatters = (
	timeZone: string,
): {
	day: Intl.DateTimeFormat;
	time: Intl.DateTimeFormat;
	date: Intl.DateTimeFormat;
} => {
	const cached = formatters.get(timeZone);
	if (cached) return cached;
	const value = {
		day: new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}),
		time: new Intl.DateTimeFormat("en", {
			timeZone,
			hour: "numeric",
			minute: "2-digit",
		}),
		date: new Intl.DateTimeFormat("en", {
			timeZone,
			month: "short",
			day: "numeric",
		}),
	};
	if (formatters.size >= 16) formatters.clear();
	formatters.set(timeZone, value);
	return value;
};
export const chatTimeLabel = (
	timestamp: number,
	timeZone = defaultClubTimeZone,
	now = Date.now(),
): string => {
	if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
	const { day, time, date } = chatFormatters(timeZone);
	return (day.format(timestamp) === day.format(now) ? time : date).format(
		timestamp,
	);
};

export const messageTimeLabel = (
	message: Pick<ThreadMessage, "time">,
	timeZone?: string,
): string => {
	const timestamp = Date.parse(message.time);
	return /^\d{4}-\d{2}-\d{2}T/.test(message.time) && Number.isFinite(timestamp)
		? pollMessageTime(timestamp, timeZone)
		: message.time.trim();
};

export const messageClockLabel = (
	message: Pick<ThreadMessage, "time">,
	timeZone?: string,
): string | undefined => {
	const timestamp = Date.parse(message.time);
	const label =
		/^\d{4}-\d{2}-\d{2}T/.test(message.time) && Number.isFinite(timestamp)
			? chatFormatters(timeZone ?? defaultClubTimeZone).time.format(timestamp)
			: message.time.trim();
	return /\d{1,2}:\d{2}/.test(label) ? label : undefined;
};

export const messageClusterWindowMs = 5 * 60 * 1000;

export type MessagePresentation = {
	showAuthor: boolean;
	timeLabel?: string;
};

export const messagePresentations = (
	messages: Pick<ThreadMessage, "id" | "accountId" | "createdAt" | "time">[],
	{
		accountId,
		showAuthors,
		hasOlderMessages,
		timeZone,
	}: {
		accountId: string;
		showAuthors: boolean;
		hasOlderMessages: boolean;
		timeZone?: string;
	},
): Map<string, MessagePresentation> =>
	new Map(
		messages.map((message, index): [string, MessagePresentation] => {
			const older = messages.at(index + 1);
			const difference = older
				? message.createdAt - older.createdAt
				: undefined;
			const validGap =
				difference !== undefined &&
				Number.isFinite(message.createdAt) &&
				Number.isFinite(older?.createdAt) &&
				difference >= 0;
			const adjacent =
				validGap &&
				difference !== undefined &&
				difference <= messageClusterWindowMs;
			const sameAuthor = older?.accountId === message.accountId;
			return [
				message.id,
				{
					showAuthor:
						showAuthors &&
						message.accountId !== accountId &&
						(!adjacent || !sameAuthor),
					timeLabel:
						message.time.trim() && (older ? !adjacent : !hasOlderMessages)
							? /^\d{4}-\d{2}-\d{2}T/.test(message.time) &&
								Number.isFinite(Date.parse(message.time))
								? chatTimeLabel(Date.parse(message.time), timeZone)
								: message.time
							: undefined,
				},
			];
		}),
	);
