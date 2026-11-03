import { actionPeople } from "./action-people";
import {
	addDays,
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
import { validateEquipment } from "./equipment";
import { memberLoan } from "./equipment-loans";
import { editedOccurrences, eligibleResponses } from "./event-recurrence";
import { clubDate, signupState } from "./event-time";
import { feedbackKind } from "./feedback-access";
import { updateGoal } from "./goals";
import {
	assignLineupPosition,
	lineupSnapshot,
	normalizeLineup,
	saveLineup,
	validateLineup,
	validateLineupReferees,
	writeTeamPlan,
} from "./lineup";
import { carryForwardLineup } from "./lineup-carry";
import { setMemberArchived } from "./member-lifecycle";
import { reduceMessages } from "./message-reducer";
import {
	canManageNotice,
	editNotice,
	isNoticeActive,
	validateNoticeDraft,
} from "./notices";
import { defaultPlayerCoaching } from "./player-coaching";
import {
	aggregateAttendance,
	attendanceForPart,
	participatesInPart,
	practicePartKey,
	selectedParts,
	validatePartSelection,
} from "./practice-parts";
import { clubPrograms, deleteProgram, saveProgram } from "./programs";
import { validatePartResponses } from "./schedule-agenda";
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
	const references = new Set(actionPeople(action));
	if (
		data.members.some((entry) => references.has(entry.id) && entry.mergedInto)
	)
		throw new Error(
			"This profile was merged. Open the current member before making changes.",
		);
	const member =
		"personId" in action
			? data.members.find((entry) => entry.id === action.personId)
			: undefined;
	const event =
		"eventId" in action
			? data.events.find((entry) => entry.id === action.eventId)
			: undefined;
	switch (action.type) {
		case "delete-program":
			requireAccess(account.admin);
			return deleteProgram(data, action.id, action.expectedRevision);
		case "save-program":
			requireAccess(account.admin);
			return saveProgram(
				data,
				action.draft,
				action.expectedRevision,
				action.memberIds,
			);
		case "set-member-archived":
			requireAccess(account.admin && Boolean(member));
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId
						? setMemberArchived(
								entry,
								action.archived,
								clubDate(undefined, data.timeZone),
							)
						: entry,
				),
			};
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
			if (action.member.mergedInto || action.member.mergedAt)
				throw new Error(
					"Use member merge to create an archived profile alias.",
				);
			if (
				!action.member.name.trim() ||
				!Number.isInteger(action.charge) ||
				action.charge < 0 ||
				action.charge > 1000000 ||
				!action.member.programs.every((program) =>
					clubPrograms(data).some(
						(entry) => entry.id === program && !entry.archived,
					),
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
			if (current.seriesExpected && action.response === "unavailable")
				throw new Error("Use the series attendance form and provide a reason.");
			validatePartSelection(event, action.partIds);
			validatePartResponses(
				event,
				action.response,
				action.partIds,
				action.declinedPartIds,
			);
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
				absenceReason:
					action.response === "going" ? undefined : current.absenceReason,
				partIds: action.response === "going" ? action.partIds : undefined,
				declinedPartIds: action.declinedPartIds,
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
						canRegister({ ...member, archived: false }, event) &&
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
			if (
				action.draft.program !== "all" &&
				!clubPrograms(data).some(
					(program) =>
						program.id === action.draft.program &&
						!program.archived &&
						program.status !== "completed",
				)
			)
				throw new Error("Choose an active program.");
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
			if (
				action.draft.program !== event?.program &&
				action.draft.program !== "all" &&
				!clubPrograms(data).some(
					(program) =>
						program.id === action.draft.program &&
						!program.archived &&
						program.status !== "completed",
				)
			)
				throw new Error("Choose an active program.");
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
			const previous = data.teams.find(
				(entry) =>
					entry.eventId === action.eventId && entry.partId === action.partId,
			);
			const plan = writeTeamPlan(
				previous,
				normalizeLineup({
					partId: action.partId,
					separateYouth: action.separateYouth ?? true,
					excludedPersonIds,
					assignments: [...generated.black, ...generated.white].map(
						(player) => ({
							personId: player.id,
							position: player.assignedPosition,
							ageGroup: player.ageGroup,
						}),
					),
					eventId: action.eventId,
					black: generated.black.map((entry) => entry.id),
					white: generated.white.map((entry) => entry.id),
					attendees: attendees.map((entry) => entry.id),
					published: false,
				}),
				action.expectedRevision,
			);
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
		case "carry-lineup": {
			requireAccess(
				Boolean(event && !event.cancelled && canCoach(account, event.program)),
			);
			const sourceEvent = data.events.find(
				(entry) => entry.id === action.sourceEventId,
			);
			const source = data.teams.find(
				(entry) =>
					entry.eventId === action.sourceEventId &&
					entry.partId === action.sourcePartId,
			);
			if (!event || !sourceEvent || !source)
				throw new Error("Source lineup unavailable.");
			const previous = data.teams.find(
				(entry) => entry.eventId === event.id && entry.partId === action.partId,
			);
			const carried = carryForwardLineup({
				source,
				sourceEvent,
				targetEvent: event,
				partId: action.partId,
				previous,
				attendees: eventAttendees(data, event.id, action.partId),
				profiles: data.playerCoaching ?? [],
				members: data.members,
				expectedSourceRevision: action.expectedSourceRevision,
				expectedRevision: action.expectedRevision,
			});
			return { ...data, teams: [...data.teams, carried] };
		}
		case "save-lineup": {
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
				throw new Error("Lineup changed. Regenerate teams before editing.");
			const refereeIssue = validateLineupReferees(
				action.snapshot,
				data.members,
			);
			if (refereeIssue) throw new Error(refereeIssue);
			if (
				action.snapshot.positions.some(
					(entry) =>
						entry.ageGroup !== undefined &&
						entry.ageGroup !==
							(data.playerCoaching?.find(
								(profile) => profile.personId === entry.personId,
							)?.ageGroup ??
								plan.assignments?.find(
									(assignment) => assignment.personId === entry.personId,
								)?.ageGroup ??
								(data.members
									.find((member) => member.id === entry.personId)
									?.programs.includes("youth")
									? "youth"
									: "adult")),
				)
			)
				throw new Error("Use the player's current age group.");
			const next = saveLineup(plan, action.snapshot, action.expectedRevision);
			return {
				...data,
				teams: data.teams.map((entry) => (entry === plan ? next : entry)),
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
			if (action.type === "publish-teams") {
				const refereeIssue = validateLineupReferees(
					lineupSnapshot(plan),
					data.members,
				);
				if (refereeIssue) throw new Error(refereeIssue);
				if (plan.blackFormation || plan.whiteFormation) {
					const error = validateLineup(plan, lineupSnapshot(plan));
					if (error) throw new Error(error);
				}
				return {
					...data,
					teams: data.teams.map((entry) =>
						entry === plan
							? writeTeamPlan(
									plan,
									{ ...entry, published: true },
									action.expectedRevision,
								)
							: entry,
					),
				};
			}
			requireAccess([...plan.black, ...plan.white].includes(action.personId));
			const snapshot = lineupSnapshot(plan);
			const fromBlack = plan.black.includes(action.personId);
			const position = snapshot.positions.find(
				(entry) => entry.personId === action.personId,
			)?.position;
			if (!position) throw new Error("Choose a positioned player.");
			const next = saveLineup(
				plan,
				assignLineupPosition(
					plan,
					snapshot,
					action.personId,
					action.type === "assign-position"
						? fromBlack
							? "black"
							: "white"
						: fromBlack
							? "white"
							: "black",
					action.type === "assign-position" ? action.position : position,
				),
				action.expectedRevision ?? plan.revision ?? 0,
			);
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
			const existing = data.feedback.find(
				(entry) => entry.id === action.feedback.id,
			);
			const newShoutout =
				target &&
				(!existing || existing.authorId === account.id) &&
				feedbackKind(action.feedback) === "shoutout" &&
				action.feedback.visibility === "published";
			requireAccess(
				Boolean(target && (canCoachMember(account, target) || newShoutout)),
			);
			if (
				feedbackKind(action.feedback) === "shoutout" &&
				(target?.archived || target?.mergedInto)
			)
				throw new Error("Choose an active player.");
			if (
				feedbackKind(action.feedback) === "shoutout" &&
				action.feedback.body.length > 1000
			)
				throw new Error("Keep shoutout notes to 1,000 characters.");
			if (!validDate(action.feedback.date))
				throw new Error("Choose a valid feedback date.");
			if (
				action.feedback.eventId &&
				!data.events.some((entry) => entry.id === action.feedback.eventId)
			)
				throw new Error("Practice not found.");
			if (
				action.feedback.category &&
				feedbackKind(action.feedback) !== "shoutout"
			)
				throw new Error("Recognition categories are for shoutouts only.");
			if (!action.feedback.body.trim() && !action.feedback.category)
				throw new Error("Write some feedback first.");
			if (
				feedbackKind(action.feedback) === "shoutout" &&
				action.feedback.visibility !== "published"
			)
				throw new Error("Shoutouts must be sent to the recipient.");
			if (existing && feedbackKind(existing) !== feedbackKind(action.feedback))
				throw new Error("Keep coaching feedback and shoutouts separate.");
			if (
				existing?.visibility === "published" &&
				existing.authorId === account.id &&
				existing.personId === action.feedback.personId &&
				action.feedback.visibility === "published" &&
				existing.body === action.feedback.body.trim().slice(0, 10000) &&
				existing.category === action.feedback.category &&
				existing.eventId === action.feedback.eventId &&
				existing.date === action.feedback.date
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
						kind: feedbackKind(action.feedback),
						authorId: account.id,
						authorName:
							feedbackKind(action.feedback) === "coaching"
								? account.name
								: undefined,
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
					(entry && account.admin && feedbackKind(entry) === "shoutout") ||
						(entry &&
							member &&
							entry.authorId === account.id &&
							entry.visibility !== "published" &&
							canCoachMember(account, member)),
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
		case "review-goal":
		case "set-goal": {
			const updated = updateGoal(member, account, action);
			return {
				...data,
				members: data.members.map((entry) =>
					entry.id === action.personId ? updated : entry,
				),
			};
		}
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
		case "edit-notice": {
			const notice = data.notices.find((entry) => entry.id === action.noticeId);
			if (!notice) throw new Error("Announcement unavailable.");
			const updated = editNotice(
				notice,
				account,
				action,
				clubDate(undefined, data.timeZone),
			);
			return {
				...data,
				notices: data.notices.map((entry) =>
					entry.id === notice.id ? updated : entry,
				),
			};
		}
		case "dismiss-notice":
		case "expire-notice": {
			const notice = visibleNotices(data, account).find(
				(entry) => entry.id === action.noticeId,
			);
			requireAccess(Boolean(notice));
			if (action.type === "expire-notice") {
				requireAccess(Boolean(notice && canManageNotice(account, notice)));
				if (
					!notice ||
					!isNoticeActive(notice, clubDate(undefined, data.timeZone))
				)
					throw new Error("Only live announcements can be ended.");
			}
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
		case "create-notice": {
			if (!validDate(action.notice.date))
				throw new Error("Choose a valid publication date.");
			const expiresAt =
				action.notice.expiresAt ?? addDays(action.notice.date, 14);
			requireAccess(canManageNotice(account, action.notice));
			const error = validateNoticeDraft(
				{ body: action.notice.body, expiresAt },
				action.notice.date,
			);
			if (error) throw new Error(error);
			if (!action.notice.title.trim()) throw new Error("Add a title.");
			if (data.notices.some((entry) => entry.id === action.notice.id))
				return data;
			return {
				...data,
				notices: [
					{
						...action.notice,
						title: action.notice.title.trim(),
						body: action.notice.body.trim(),
						postedAt: Date.now(),
						expiresAt,
						acknowledgedBy: [],
						dismissedBy: [],
					},
					...data.notices,
				],
			};
		}
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
			const loan = memberLoan({
				loan: action.loan,
				item: data.equipment.find((entry) => entry.id === action.loan.itemId),
				loans: data.loans,
				members: data.members,
			});
			if (data.loans.some((entry) => entry.id === loan.id)) return data;
			return {
				...data,
				loans: [...data.loans, loan],
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
