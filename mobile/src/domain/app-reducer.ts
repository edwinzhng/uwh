import {
	balance,
	canCoach,
	canCoachMember,
	canManagePerson,
	canRegister,
	createOccurrences,
	eventAttendees,
	eventResponse,
	lineupNeedsReview,
	validateEvent,
	validDate,
	visibleNotices,
} from "./app-rules";
import type { Account, AppAction, AppData, EventResponse } from "./app-types";
import { generatePreviewTeams } from "./club";
import { editedOccurrences, eligibleResponses } from "./event-recurrence";
import { signupState } from "./event-time";
import { reduceMessages } from "./message-reducer";
import { defaultPlayerCoaching } from "./player-coaching";

const requireAccess = (allowed: boolean): void => {
	if (!allowed) throw new Error("You don’t have access to this action.");
};
export const reduceApp = (
	data: AppData,
	account: Account,
	action: AppAction,
): AppData => {
	const member =
		"personId" in action
			? data.members.find((entry) => entry.id === action.personId)
			: undefined;
	const event =
		"eventId" in action
			? data.events.find((entry) => entry.id === action.eventId)
			: undefined;
	switch (action.type) {
		case "add-season":
			requireAccess(account.admin);
			if (
				!action.season.name.trim() ||
				!validDate(action.season.start) ||
				!validDate(action.season.end) ||
				action.season.end < action.season.start
			)
				throw new Error("Check the season name and dates.");
			if (data.seasons.some((season) => season.id === action.season.id))
				return data;
			return {
				...data,
				seasons: [
					...data.seasons,
					{ ...action.season, name: action.season.name.trim() },
				],
			};
		case "add-member":
			requireAccess(account.admin);
			if (
				!action.member.name.trim() ||
				!Number.isInteger(action.charge) ||
				action.charge < 0 ||
				action.charge > 1000000 ||
				!action.member.programs.every(
					(program) => program === "club" || program === "youth",
				)
			)
				throw new Error("Check the member details and fee.");
			if (data.members.some((entry) => entry.id === action.member.id))
				return data;
			return {
				...data,
				members: [...data.members, action.member],
				charges: [
					...data.charges,
					{ personId: action.member.id, amount: action.charge },
				],
			};
		case "respond": {
			requireAccess(
				Boolean(
					member &&
						event &&
						canManagePerson(account, member.id) &&
						canRegister(member, event),
				),
			);
			if (!event || signupState(event, Date.now()) !== "open")
				throw new Error("Signup is not open.");
			const current = eventResponse(data, event.id, action.personId);
			const going = data.responses.filter(
				(entry) =>
					entry.eventId === event.id &&
					entry.personId !== action.personId &&
					entry.response === "going",
			).length;
			const response =
				action.response === "going" && going >= event.capacity
					? "waiting"
					: action.response;
			const next: EventResponse = { ...current, response };
			const responses = [
				...data.responses.filter(
					(entry) =>
						!(entry.eventId === event.id && entry.personId === action.personId),
				),
				next,
			];
			const waiting = responses.find(
				(entry) => entry.eventId === event.id && entry.response === "waiting",
			);
			const space =
				responses.filter(
					(entry) => entry.eventId === event.id && entry.response === "going",
				).length < event.capacity;
			return {
				...data,
				responses:
					waiting && space
						? responses.map((entry) =>
								entry === waiting ? { ...entry, response: "going" } : entry,
							)
						: responses,
			};
		}
		case "attendance": {
			requireAccess(
				Boolean(
					member &&
						event &&
						canRegister(member, event) &&
						(account.admin || canCoach(account, event.program)),
				),
			);
			const entry = {
				...eventResponse(data, action.eventId, action.personId),
				attendance: action.attendance,
			};
			return {
				...data,
				responses: [
					...data.responses.filter(
						(response) =>
							!(
								response.eventId === action.eventId &&
								response.personId === action.personId
							),
					),
					entry,
				],
			};
		}
		case "create-event": {
			requireAccess(account.admin);
			if (
				!data.seasons.some(
					(season) => season.id === (action.draft.seasonId ?? "2026-2027"),
				)
			)
				throw new Error("Choose a season.");
			const error = validateEvent(action.draft);
			if (error) throw new Error(error);
			if (
				action.draft.eligiblePersonIds?.some(
					(id) =>
						!data.members.some(
							(member) => member.id === id && member.programs.length > 0,
						),
				)
			)
				throw new Error("Choose players from this club.");
			const events = createOccurrences(action.id, action.draft);
			if (
				data.events.some((entry) =>
					events.some((event) => event.id === entry.id),
				)
			)
				return data;
			return { ...data, events: [...data.events, ...events] };
		}
		case "edit-event": {
			if (account.admin && action.editId && event?.editId === action.editId)
				return data;
			requireAccess(account.admin && Boolean(event && !event.cancelled));
			if (!event) throw new Error("Event unavailable.");
			if (
				!data.seasons.some(
					(season) => season.id === (action.draft.seasonId ?? "2026-2027"),
				)
			)
				throw new Error("Choose a season.");
			const error = validateEvent({ ...action.draft, repeat: "once" });
			if (error) throw new Error(error);
			if (
				action.draft.eligiblePersonIds?.some(
					(id) =>
						!data.members.some(
							(member) => member.id === id && member.programs.length > 0,
						),
				)
			)
				throw new Error("Choose players from this club.");
			const events = editedOccurrences(
				data.events,
				event,
				action.draft,
				action.scope,
				Date.now(),
				action.editId,
			);
			const changed = events.filter(
				(entry) =>
					entry !== data.events.find((original) => original.id === entry.id),
			);
			for (const entry of changed) {
				const issue = validateEvent({
					...action.draft,
					date: entry.date,
					repeat: "once",
				});
				if (issue) throw new Error(issue);
			}
			return {
				...data,
				events,
				responses: eligibleResponses(
					data,
					events,
					changed.map((entry) => entry.id),
				),
			};
		}
		case "cancel-event":
			requireAccess(account.admin && Boolean(event));
			return {
				...data,
				events: data.events.map((entry) =>
					entry.id === action.eventId ? { ...entry, cancelled: true } : entry,
				),
			};
		case "generate-teams": {
			requireAccess(
				Boolean(event && !event.cancelled && canCoach(account, event.program)),
			);
			const attendees = eventAttendees(data, action.eventId);
			if (attendees.length < 2)
				throw new Error("At least two attendees are needed.");
			const excludedPersonIds = [...new Set(action.excludedPersonIds ?? [])];
			if (
				excludedPersonIds.some(
					(id) => !attendees.some((member) => member.id === id),
				)
			)
				throw new Error("Only attendees can be excluded.");
			if (attendees.length - excludedPersonIds.length < 2)
				throw new Error("Include at least two players.");
			const generated = generatePreviewTeams(
				attendees.map((entry) => ({
					...defaultPlayerCoaching(entry),
					...data.playerCoaching?.find((value) => value.personId === entry.id),
					id: entry.id,
					name: entry.name,
					position: entry.position,
					response: "going",
					attendance: "unmarked",
				})),
				{ separateYouth: action.separateYouth ?? true, excludedPersonIds },
			);
			const plan = {
				separateYouth: action.separateYouth ?? true,
				excludedPersonIds,
				assignments: [...generated.black, ...generated.white].map((player) => ({
					personId: player.id,
					position: player.assignedPosition,
					ageGroup: player.ageGroup,
				})),
				eventId: action.eventId,
				black: generated.black.map((entry) => entry.id),
				white: generated.white.map((entry) => entry.id),
				attendees: attendees.map((entry) => entry.id),
				published: false,
			};
			return {
				...data,
				teams: [
					...data.teams.filter((entry) => entry.eventId !== action.eventId),
					plan,
				],
			};
		}
		case "move-player":
		case "assign-position":
		case "publish-teams": {
			requireAccess(
				Boolean(event && !event.cancelled && canCoach(account, event.program)),
			);
			const plan = data.teams.find((entry) => entry.eventId === action.eventId);
			if (!plan) throw new Error("Generate teams first.");
			if (lineupNeedsReview(data, plan))
				throw new Error("Lineup changed. Regenerate teams before publishing.");
			if (action.type === "publish-teams")
				return {
					...data,
					teams: data.teams.map((entry) =>
						entry === plan ? { ...entry, published: true } : entry,
					),
				};
			requireAccess([...plan.black, ...plan.white].includes(action.personId));
			if (action.type === "assign-position")
				return {
					...data,
					teams: data.teams.map((entry) =>
						entry === plan
							? {
									...entry,
									published: false,
									assignments: (
										entry.assignments ??
										entry.attendees.map((personId) => ({
											personId,
											position: "FORWARD" as const,
											ageGroup: "adult" as const,
										}))
									).map((assignment) =>
										assignment.personId === action.personId
											? { ...assignment, position: action.position }
											: assignment,
									),
								}
							: entry,
					),
				};
			const fromBlack = plan.black.includes(action.personId);
			const next = {
				...plan,
				published: false,
				black: fromBlack
					? plan.black.filter((id) => id !== action.personId)
					: [...plan.black, action.personId],
				white: fromBlack
					? [...plan.white, action.personId]
					: plan.white.filter((id) => id !== action.personId),
			};
			return {
				...data,
				teams: data.teams.map((entry) => (entry === plan ? next : entry)),
			};
		}
		case "save-plan":
			requireAccess(Boolean(event && canCoach(account, event.program)));
			return {
				...data,
				plans: { ...data.plans, [action.eventId]: action.body.slice(0, 10000) },
			};
		case "save-feedback": {
			const target = data.members.find(
				(entry) => entry.id === action.feedback.personId,
			);
			requireAccess(Boolean(target && canCoachMember(account, target)));
			if (!action.feedback.body.trim())
				throw new Error("Write some feedback first.");
			const existing = data.feedback.find(
				(entry) => entry.id === action.feedback.id,
			);
			if (
				existing?.visibility === "published" &&
				existing.authorId === account.id &&
				existing.personId === action.feedback.personId &&
				action.feedback.visibility === "published" &&
				existing.body === action.feedback.body.trim().slice(0, 10000)
			)
				return data;
			if (
				existing?.visibility === "private" &&
				action.feedback.visibility !== "private"
			)
				throw new Error(
					"Keep private notes private. Create new feedback to share.",
				);
			if (
				existing &&
				(existing.authorId !== account.id ||
					existing.personId !== action.feedback.personId ||
					existing.visibility === "published")
			)
				throw new Error("This feedback cannot be overwritten.");
			return {
				...data,
				feedback: [
					...data.feedback.filter((entry) => entry.id !== action.feedback.id),
					{
						...action.feedback,
						authorId: account.id,
						body: action.feedback.body.trim().slice(0, 10000),
					},
				],
			};
		}
		case "delete-feedback": {
			const entry = data.feedback.find((item) => item.id === action.id);
			const member = data.members.find(
				(member) => member.id === entry?.personId,
			);
			requireAccess(
				Boolean(
					entry &&
						member &&
						entry.authorId === account.id &&
						entry.visibility !== "published" &&
						canCoachMember(account, member),
				),
			);
			return {
				...data,
				feedback: data.feedback.filter((entry) => entry.id !== action.id),
			};
		}
		case "publish-feedback": {
			const entry = data.feedback.find((item) => item.id === action.id);
			const target = data.members.find((item) => item.id === entry?.personId);
			requireAccess(
				Boolean(
					entry &&
						target &&
						canCoachMember(account, target) &&
						entry.authorId === account.id &&
						entry.visibility === "draft",
				),
			);
			return {
				...data,
				feedback: data.feedback.map((item) =>
					item.id === action.id ? { ...item, visibility: "published" } : item,
				),
			};
		}
		case "set-goal":
			requireAccess(Boolean(member && canCoachMember(account, member)));
			if (!action.goal.trim() || action.goal.length > 500)
				throw new Error("Add a goal under 500 characters.");
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? { ...entry, goal: action.goal.trim(), steps: 0 }
						: entry,
				),
			};
		case "goal-step":
			requireAccess(
				Boolean(
					member &&
						(account.personId === member.id || canCoachMember(account, member)),
				),
			);
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? {
								...entry,
								steps: Math.min(
									6,
									Math.max(0, entry.steps + Math.sign(action.delta)),
								),
							}
						: entry,
				),
			};
		case "send-message":
		case "edit-message":
		case "delete-message":
		case "set-reaction":
		case "create-thread":
			return { ...data, ...reduceMessages(data, account, action) };
		case "acknowledge":
			requireAccess(
				visibleNotices(data, account).some(
					(entry) => entry.id === action.noticeId,
				),
			);
			return {
				...data,
				notices: data.notices.map((entry) =>
					entry.id === action.noticeId &&
					!entry.acknowledgedBy.includes(account.id)
						? {
								...entry,
								acknowledgedBy: [...entry.acknowledgedBy, account.id],
							}
						: entry,
				),
			};
		case "create-notice":
			requireAccess(account.admin || canCoach(account, action.notice.program));
			if (!action.notice.title.trim() || !action.notice.body.trim())
				throw new Error("Add a title and message.");
			if (data.notices.some((entry) => entry.id === action.notice.id))
				return data;
			return {
				...data,
				notices: [{ ...action.notice, acknowledgedBy: [] }, ...data.notices],
			};
		case "registration":
			requireAccess(account.admin && Boolean(member));
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? { ...entry, registration: action.status }
						: entry,
				),
			};
		case "payment":
			requireAccess(account.admin);
			if (data.payments.some((entry) => entry.id === action.payment.id))
				return data;
			if (
				!Number.isInteger(action.payment.amount) ||
				action.payment.amount <= 0 ||
				action.payment.amount > balance(data, action.payment.personId)
			)
				throw new Error("Enter an amount up to the outstanding balance.");
			return {
				...data,
				payments: [...data.payments, action.payment],
				paymentTotals:
					data.paymentTotals?.[action.payment.personId] !== undefined
						? {
								...data.paymentTotals,
								[action.payment.personId]:
									(data.paymentTotals[action.payment.personId] ?? 0) +
									action.payment.amount,
							}
						: data.paymentTotals,
			};
		case "issue": {
			requireAccess(account.admin);
			if (data.loans.some((entry) => entry.id === action.loan.id)) return data;
			const item = data.equipment.find(
				(entry) => entry.id === action.loan.itemId,
			);
			if (
				!item ||
				item.condition !== "ready" ||
				data.loans.some((entry) => entry.itemId === item.id && !entry.returned)
			)
				throw new Error("This item is unavailable.");
			if (
				!data.members.some((entry) => entry.id === action.loan.personId) ||
				!validDate(action.loan.due)
			)
				throw new Error("Choose a member and return date.");
			return {
				...data,
				loans: [...data.loans, { ...action.loan, returned: false }],
			};
		}
		case "return":
			requireAccess(account.admin);
			return {
				...data,
				loans: data.loans.map((entry) =>
					entry.id === action.loanId ? { ...entry, returned: true } : entry,
				),
			};
		case "add-equipment":
			requireAccess(account.admin);
			if (!action.equipment.name.trim()) throw new Error("Add an item name.");
			if (data.equipment.some((entry) => entry.id === action.equipment.id))
				return data;
			return { ...data, equipment: [...data.equipment, action.equipment] };
		case "add-tracker":
			requireAccess(account.admin);
			if (!action.tracker.name.trim()) throw new Error("Add a tracker name.");
			if (data.trackers.some((entry) => entry.id === action.tracker.id))
				return data;
			return { ...data, trackers: [...data.trackers, action.tracker] };
		case "tracker-value": {
			requireAccess(account.admin && Boolean(member));
			const tracker = data.trackers.find(
				(entry) => entry.id === action.trackerId,
			);
			requireAccess(
				Boolean(
					tracker &&
						member &&
						(tracker.program === "all" ||
							member.programs.includes(tracker.program)),
				),
			);
			return {
				...data,
				trackerValues: {
					...data.trackerValues,
					[`${action.trackerId}:${action.personId}`]: action.value.slice(
						0,
						1000,
					),
				},
			};
		}
		case "settings":
			requireAccess(account.admin);
			if (!action.clubName.trim()) throw new Error("Add a club name.");
			return {
				...data,
				clubName: action.clubName.trim(),
				reminders: action.reminders,
			};
	}
};
