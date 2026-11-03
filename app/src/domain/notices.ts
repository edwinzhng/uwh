import type { Account, AppAction, Notice } from "./app-types";
import { addDays, validDate } from "./calendar-dates";

export const canManageNotice = (
	account: Account,
	notice: Pick<Notice, "program">,
): boolean => account.admin || account.coachPrograms.includes(notice.program);

export const validateNoticeDraft = (
	draft: { body: string; expiresAt?: string },
	today: string,
	allowNoExpiry = false,
): string | undefined => {
	if (!draft.body.trim()) return "Write an announcement.";
	if (draft.body.length > 500) return "Use 500 characters or fewer.";
	if (!draft.expiresAt && allowNoExpiry) return undefined;
	if (
		!draft.expiresAt ||
		!validDate(draft.expiresAt) ||
		draft.expiresAt <= today
	)
		return "Choose an end date after today.";
	return undefined;
};

export const defaultNoticeExpiry = (date: string): string => addDays(date, 14);

export const isNoticeActive = (notice: Notice, today: string): boolean =>
	notice.date <= today && (!notice.expiresAt || notice.expiresAt > today);

export const editNotice = (
	notice: Notice,
	account: Account,
	change: Extract<AppAction, { type: "edit-notice" }>,
	today: string,
): Notice => {
	if (!canManageNotice(account, notice))
		throw new Error("You don’t have access to this announcement.");
	if (!isNoticeActive(notice, today))
		throw new Error("Only live announcements can be changed.");
	const error = validateNoticeDraft(
		change,
		today,
		notice.expiresAt === undefined,
	);
	if (error) throw new Error(error);
	const body = change.body.trim();
	if (notice.body === body && notice.expiresAt === change.expiresAt)
		return notice;
	if (
		notice.body !== change.expectedBody ||
		notice.expiresAt !== change.expectedExpiresAt
	)
		throw new Error("This announcement changed. Reopen it before saving.");
	return { ...notice, body, expiresAt: change.expiresAt };
};

export const bannerNotices = (
	notices: Notice[],
	accountId: string,
	today: string,
): Notice[] =>
	notices
		.filter(
			(notice) =>
				isNoticeActive(notice, today) &&
				!notice.dismissedBy?.includes(accountId),
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
