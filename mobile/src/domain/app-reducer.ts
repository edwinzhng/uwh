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
import { equipmentStock, validateEquipment } from "./equipment";
import { editedOccurrences, eligibleResponses } from "./event-recurrence";
import { clubDate, signupState } from "./event-time";
import { reduceMessages } from "./message-reducer";
import { defaultPlayerCoaching } from "./player-coaching";
import {
	aggregateAttendance,
	attendanceForPart,
	participatesInPart,
	practicePartKey,
	selectedParts,
	validatePartSelection,
} from "./practice-parts";
import {
	canonicalTimeZone,
	defaultClubTimeZone,
	validTimeZone,
} from "./time-zones";

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
			validatePartSelection(event, action.partIds);
			const going = data.responses.filter(
				(entry) =>
					entry.eventId === event.id &&
					entry.personId !== action.personId &&
					(entry.response === "going" || entry.seriesExpected),
			).length;
			const response =
				action.response === "going" && going >= (event.capacity ?? Infinity)
					? "waiting"
					: action.response;
			const updated: EventResponse = {
				...current,
				response,
				partIds: action.response === "going" ? action.partIds : undefined,
			};
			const next: EventResponse = {
				...updated,
				attendance: aggregateAttendance(event, updated),
			};
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
					(entry) =>
						entry.eventId === event.id &&
						(entry.response === "going" || entry.seriesExpected),
				).length < (event.capacity ?? Infinity);
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
			if (!event || event.cancelled) throw new Error("Practice unavailable.");
			const current = eventResponse(data, action.eventId, action.personId);
			if (
				action.partId &&
				(!event.parts?.some((part) => part.id === action.partId) ||
					!participatesInPart(current, action.partId))
			)
				throw new Error("Player is not registered for this part.");
			const marked = event.parts?.length
				? {
						...current,
						partAttendance: event.parts.map((part) => ({
							partId: part.id,
							attendance: (
								action.partId
									? part.id === action.partId
									: selectedParts(event, current).some(
											(selected) => selected.id === part.id,
										)
							)
								? action.attendance
								: attendanceForPart(current, part.id),
						})),
					}
				: { ...current, attendance: action.attendance };
			const entry = {
				...marked,
				attendance: aggregateAttendance(event, marked),
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
			const draft = {
				...action.draft,
				timeZone:
					(action.draft.kind === "tournament"
						? action.draft.timeZone
						: undefined) ??
					data.timeZone ??
					defaultClubTimeZone,
			};
			if (
				!data.seasons.some(
					(season) => season.id === (action.draft.seasonId ?? "2026-2027"),
				)
			)
				throw new Error("Choose a season.");
			const error = validateEvent(draft);
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
			if (
				draft.tournamentRoster?.some(
					(entry) =>
						!data.members.some(
							(member) =>
								member.id === entry.personId && member.programs.length > 0,
						),
				)
			)
				throw new Error("Choose roster players from this club.");
			const events = createOccurrences(action.id, draft);
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
			const draft = {
				...action.draft,
				timeZone:
					(action.draft.kind === "tournament"
						? action.draft.timeZone
						: undefined) ??
					event.timeZone ??
					defaultClubTimeZone,
			};
			if (
				!data.seasons.some(
					(season) => season.id === (action.draft.seasonId ?? "2026-2027"),
				)
			)
				throw new Error("Choose a season.");
			const error = validateEvent({ ...draft, repeat: "once" });
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
			if (
				draft.tournamentRoster?.some(
					(entry) =>
						!data.members.some(
							(member) =>
								member.id === entry.personId && member.programs.length > 0,
						),
				)
			)
				throw new Error("Choose roster players from this club.");
			const events = editedOccurrences(
				data.events,
				event,
				draft,
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
					...draft,
					timeZone: entry.timeZone,
					date: entry.date,
					repeat: "once",
				});
				if (issue) throw new Error(issue);
			}
			return {
				...data,
				events,
				teams: data.teams.map((plan) => {
					const revised = changed.find((entry) => entry.id === plan.eventId);
					const previous = data.events.find(
						(entry) => entry.id === plan.eventId,
					);
					return revised &&
						previous &&
						(revised.cancelled ||
							JSON.stringify(revised.parts) !== JSON.stringify(previous.parts))
						? { ...plan, published: false, coachingStale: true }
						: plan;
				}),
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
			if (
				action.partId &&
				!event?.parts?.some((part) => part.id === action.partId)
			)
				throw new Error("Practice part not found.");
			const attendees = eventAttendees(data, action.eventId, action.partId);
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
				partId: action.partId,
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
					...data.teams.filter(
						(entry) =>
							entry.eventId !== action.eventId ||
							entry.partId !== action.partId,
					),
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
			if (
				action.partId &&
				!event?.parts?.some((part) => part.id === action.partId)
			)
				throw new Error("Practice part not found.");
			const plan = data.teams.find(
				(entry) =>
					entry.eventId === action.eventId && entry.partId === action.partId,
			);
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
			if (
				action.partId &&
				!event?.parts?.some((part) => part.id === action.partId)
			)
				throw new Error("Practice part unavailable.");
			requireAccess(Boolean(event && canCoach(account, event.program)));
			return {
				...data,
				plans: {
					...data.plans,
					[practicePartKey(action.eventId, action.partId)]: action.body.slice(
						0,
						10000,
					),
				},
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
		case "request-goal":
			requireAccess(Boolean(member && account.personId === member.id));
			if (
				!action.goal.trim() ||
				action.goal.length > 500 ||
				action.goal.trim() === member?.goal
			)
				throw new Error("Propose a different goal under 500 characters.");
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? { ...entry, pendingGoal: action.goal.trim() }
						: entry,
				),
			};
		case "review-goal":
			requireAccess(
				Boolean(
					member &&
						canCoachMember(account, member) &&
						account.personId !== member.id,
				),
			);
			if (!member?.pendingGoal || member.pendingGoal !== action.goal)
				throw new Error("This request has changed. Review the latest goal.");
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? {
								...entry,
								goal: action.approve ? action.goal : entry.goal,
								pendingGoal: undefined,
							}
						: entry,
				),
			};
		case "set-goal":
			requireAccess(Boolean(member && canCoachMember(account, member)));
			if (!action.goal.trim() || action.goal.length > 500)
				throw new Error("Add a goal under 500 characters.");
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? {
								...entry,
								goal: action.goal.trim(),
								steps: 0,
								pendingGoal: undefined,
							}
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
		case "dismiss-notice":
		case "expire-notice": {
			const notice = visibleNotices(data, account).find(
				(entry) => entry.id === action.noticeId,
			);
			requireAccess(Boolean(notice));
			if (action.type === "expire-notice")
				requireAccess(
					account.admin ||
						account.coachPrograms.includes(notice?.program ?? ""),
				);
			return {
				...data,
				notices: data.notices.map((entry) =>
					entry.id !== action.noticeId
						? entry
						: action.type === "expire-notice"
							? { ...entry, expiresAt: clubDate(undefined, data.timeZone) }
							: {
									...entry,
									dismissedBy: [
										...new Set([...(entry.dismissedBy ?? []), account.id]),
									],
								},
				),
			};
		}
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
			requireAccess(
				account.admin || account.coachPrograms.includes(action.notice.program),
			);
			if (
				action.notice.expiresAt &&
				(!validDate(action.notice.expiresAt) ||
					action.notice.expiresAt <= action.notice.date)
			)
				throw new Error("Expiry must be after the publication date.");
			if (!action.notice.title.trim() || !action.notice.body.trim())
				throw new Error("Add a title and message.");
			if (data.notices.some((entry) => entry.id === action.notice.id))
				return data;
			return {
				...data,
				notices: [
					{ ...action.notice, acknowledgedBy: [], dismissedBy: [] },
					...data.notices,
				],
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
				equipmentStock(item, data.loans).available === 0
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
			validateEquipment(action.equipment, data.loans);
			if (data.equipment.some((entry) => entry.id === action.equipment.id))
				return data;
			return { ...data, equipment: [...data.equipment, action.equipment] };
		case "update-equipment":
			requireAccess(account.admin);
			validateEquipment(action.equipment, data.loans);
			if (!data.equipment.some((item) => item.id === action.equipment.id))
				throw new Error("Item not found.");
			return {
				...data,
				equipment: data.equipment.map((item) =>
					item.id === action.equipment.id ? action.equipment : item,
				),
			};
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
			if (
				!validTimeZone(action.timeZone ?? data.timeZone ?? defaultClubTimeZone)
			)
				throw new Error("Choose a valid timezone.");
			return {
				...data,
				clubName: action.clubName.trim(),
				venues: action.venues
					? [
							...new Set(
								action.venues.map((venue) => venue.trim()).filter(Boolean),
							),
						]
					: data.venues,
				timeZone: canonicalTimeZone(
					action.timeZone ?? data.timeZone ?? defaultClubTimeZone,
				),
				reminders: action.reminders,
			};
	}
};
