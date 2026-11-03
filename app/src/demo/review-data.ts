import { reduceApp } from "../domain/app-reducer";
import { addDays } from "../domain/app-rules";
import type { AppData } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import { primaryAccount } from "./app-data";
import { withMemberMergeFixtures } from "./member-merge-fixtures";

export const reviewData = (data: AppData): AppData => {
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true") return data;
	const today = new Date(`${clubDate(undefined, data.timeZone)}T12:00:00Z`);
	const anchor = new Date(
		today.getTime() + ((4 - today.getUTCDay() + 7) % 7) * 86400000,
	);
	const offset = anchor.getTime() - Date.parse("2026-09-10T12:00:00Z");
	const shift = (date: string): string =>
		new Date(Date.parse(`${date}T12:00:00Z`) + offset)
			.toISOString()
			.slice(0, 10);
	const shifted: AppData = {
		...data,
		messages: [
			...data.messages,
			{
				id: "review-format-message",
				threadId: "club",
				accountId: "alex",
				author: "Alex Rivera",
				body: "**Passing focus**\n• Look before receiving\n• Move into support\nKeep the first touch *calm*.",
				time: "9:10 AM",
			},
			{
				id: "review-practice-reminder",
				threadId: "club",
				accountId: "alex",
				author: "Alex Rivera",
				body: "**Practice reminder**\nBring both caps and arrive ten minutes early.",
				time: "9:12 AM",
			},
			{
				id: "review-club-program",
				threadId: "room:program:club",
				accountId: "alex",
				author: "Alex Rivera",
				body: "This program channel keeps players, linked guardians and staff together for weekly updates.",
				time: "9:20 AM",
			},
		],
		venues: [...new Set(data.events.map((event) => event.venue))],
		events: data.events.map((event) => ({
			...event,
			date: shift(event.date),
			endDate: event.endDate ? shift(event.endDate) : undefined,
			opensAt: event.opensAt === undefined ? undefined : event.opensAt + offset,
			closesAt:
				event.closesAt === undefined ? undefined : event.closesAt + offset,
		})),
		feedback: data.feedback.map((feedback) => ({
			...feedback,
			date: shift(feedback.date),
		})),
	};
	const current = reduceApp(shifted, primaryAccount, {
		type: "generate-teams",
		eventId: "club-thu",
		separateYouth: true,
	});
	const practice = current.events.find((event) => event.id === "club-thu");
	if (!practice) return current;
	const sourceId = "carry-source";
	const attendance = current.responses.filter(
		(response) => response.eventId === practice.id,
	);
	const withSource: AppData = {
		...current,
		events: [
			...current.events,
			{
				...practice,
				id: sourceId,
				title: "Previous hockey practice",
				date: addDays(practice.date, -2),
			},
		],
		responses: [
			...current.responses,
			...attendance.flatMap((response) => [
				{ ...response, eventId: sourceId },
				{ ...response, eventId: "hockey-fri" },
			]),
		],
	};
	const source = reduceApp(withSource, primaryAccount, {
		type: "generate-teams",
		eventId: sourceId,
		partId: "hockey",
		separateYouth: true,
	});
	return withMemberMergeFixtures(
		reduceApp(source, primaryAccount, {
			type: "publish-teams",
			eventId: sourceId,
			partId: "hockey",
			expectedRevision:
				source.teams.find(
					(plan) => plan.eventId === sourceId && plan.partId === "hockey",
				)?.revision ?? 0,
		}),
	);
};
