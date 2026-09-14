import {
	canCoach,
	canCoachMember,
	canManagePerson,
	canReadProgress,
	canReadThread,
	visibleNotices,
} from "./app-rules";
import type { Account, AppData } from "./app-types";
import { practicePartKey } from "./practice-parts";

export const visibleAppData = (data: AppData, account: Account): AppData => {
	const members = new Map(data.members.map((member) => [member.id, member]));
	const events = new Map(data.events.map((event) => [event.id, event]));
	const privatePerson = (id: string): boolean =>
		account.admin || canManagePerson(account, id);
	const coachingPerson = (id: string): boolean => {
		const member = members.get(id);
		return Boolean(member && canCoachMember(account, member));
	};
	const conversations = data.conversations.filter((entry) =>
		canReadThread(account, entry),
	);
	const threadIds = new Set(conversations.map((thread) => thread.id));
	return {
		...data,
		playerCoaching: canCoach(account) ? data.playerCoaching : undefined,
		members: data.members.map((entry) => ({
			...entry,
			rating: canCoachMember(account, entry) ? entry.rating : 0,
			registration: privatePerson(entry.id) ? entry.registration : "approved",
			goal: canReadProgress(account, entry) ? entry.goal : "",
			pendingGoal: canReadProgress(account, entry)
				? entry.pendingGoal
				: undefined,
			steps: canReadProgress(account, entry) ? entry.steps : 0,
		})),
		responses: data.responses.map((entry) => {
			const event = events.get(entry.eventId);
			const visible = {
				...entry,
				absenceReason:
					canManagePerson(account, entry.personId) ||
					(event && canCoach(account, event.program))
						? entry.absenceReason
						: undefined,
			};
			return privatePerson(entry.personId) ||
				(event && canCoach(account, event.program))
				? visible
				: {
						...entry,
						attendance: "unmarked",
						partAttendance: undefined,
						absenceReason: undefined,
					};
		}),
		teams: data.teams.filter((entry) => {
			const event = events.get(entry.eventId);
			return Boolean(
				event &&
					!event.cancelled &&
					(!entry.partId ||
						event.parts?.some((part) => part.id === entry.partId)) &&
					(entry.published || canCoach(account, event.program)),
			);
		}),
		plans: Object.fromEntries(
			Object.entries(data.plans).filter(([eventId]) =>
				data.events.some(
					(event) =>
						(event.id === eventId ||
							event.parts?.some(
								(part) => practicePartKey(event.id, part.id) === eventId,
							)) &&
						canCoach(account, event.program),
				),
			),
		),
		feedback: data.feedback.filter((entry) =>
			entry.visibility === "published"
				? canManagePerson(account, entry.personId) ||
					coachingPerson(entry.personId)
				: coachingPerson(entry.personId),
		),
		conversations,
		messages: data.messages.filter((entry) => threadIds.has(entry.threadId)),
		notices: visibleNotices(data, account).map((entry) => ({
			...entry,
			dismissedBy: entry.dismissedBy?.filter((id) => id === account.id),
			acknowledgedBy: account.admin
				? entry.acknowledgedBy
				: entry.acknowledgedBy.filter((id) => id === account.id),
		})),
		charges: data.charges.filter((entry) => privatePerson(entry.personId)),
		payments: data.payments.filter((entry) => privatePerson(entry.personId)),
		paymentTotals: data.paymentTotals
			? Object.fromEntries(
					Object.entries(data.paymentTotals).filter(([id]) =>
						privatePerson(id),
					),
				)
			: undefined,
		loans: data.loans.filter((entry) => privatePerson(entry.personId)),
		trackerValues: Object.fromEntries(
			Object.entries(data.trackerValues).filter(([key]) =>
				privatePerson(key.split(":").at(1) ?? ""),
			),
		),
	};
};
