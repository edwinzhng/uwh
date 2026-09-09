import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { initialAppData } from "../src/demo/app-data";
import { canManagePerson, eventResponse } from "../src/domain/app-rules";
import type { EventResponse } from "../src/domain/app-types";
import { eventDraft } from "../src/domain/event-recurrence";
import { attendanceForPart } from "../src/domain/practice-parts";

type MergedResponse = EventResponse & {
	response: "going" | "unavailable" | "unanswered";
};

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("Local demo backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const login = await client.action(api.auth.signIn, {
	provider: "password",
	params: {
		flow: "signIn",
		email: "demo@example.test",
		password: "CrocsClub2026!",
	},
});
assert(login.tokens, "Demo login unavailable.");
client.setAuth(login.tokens.token);
try {
	const state = await client.query(api.club.current, {
		screen: "session",
		id: "club-thu",
	});
	assert(
		state &&
			["Calgary Crocs · Demo", "Calgary Crocs"].includes(state.data.clubName) &&
			state.account.personId === "alex" &&
			state.account.admin &&
			state.account.coachPrograms.length,
		"Unexpected demo club or account.",
	);
	const training = state.data.events.find((event) => event.id === "club-thu");
	assert(training, "Missing demo Thursday practice.");
	const other = await client.query(api.club.current, {
		screen: "session",
		id: "hockey-thu",
	});
	assert(other);
	const hockey = other.data.events.find((event) => event.id === "hockey-thu");
	if (training.parts?.length && (!hockey || hockey.cancelled)) {
		console.log("Demo Thursday practice is already combined.");
	} else {
		assert(
			hockey &&
				!hockey.cancelled &&
				!training.cancelled &&
				!training.seriesId &&
				!hockey.seriesId &&
				!training.parts,
			"Unexpected demo practice structure.",
		);
		assert(
			training.title === "Club training" &&
				hockey.title === "Evening hockey" &&
				training.date === hockey.date &&
				training.start === "19:45" &&
				training.end === "20:30" &&
				hockey.start === "20:30" &&
				hockey.end === "21:30" &&
				training.venue === hockey.venue,
			"Demo practice details have been customized.",
		);
		assert(
			!training.eligiblePersonIds &&
				!hockey.eligiblePersonIds &&
				training.capacity === hockey.capacity,
			"Demo registration settings have been customized.",
		);
		assert(
			!state.data.teams.length && !other.data.teams.length,
			"Existing team plans need manual review.",
		);
		assert(
			!other.data.plans[hockey.id] &&
				(!state.data.plans[training.id] ||
					state.data.plans[training.id] === initialAppData.plans[training.id]),
			"Existing coaching plans need manual review.",
		);
		for (const eventId of [training.id, hockey.id]) {
			assert.equal(
				(await client.query(api.coaching_hours.eventCoaches, { eventId }))
					.length,
				0,
				"Existing coach assignments need manual review.",
			);
			assert.equal(
				(await client.query(api.attendance_reports.eventFlags, { eventId }))
					.length,
				0,
				"Existing attendance flags need manual review.",
			);
		}
		const responses = state.data.members.map((member): MergedResponse => {
			const first = eventResponse(state.data, training.id, member.id);
			const second = eventResponse(other.data, hockey.id, member.id);
			assert(
				!first.partAttendance?.length && !second.partAttendance?.length,
				"Unexpected practice-part attendance needs manual review.",
			);
			assert(
				first.response !== "waiting" && second.response !== "waiting",
				"Waitlisted RSVPs need manual review.",
			);
			const partIds = [
				first.response === "going" ? "training" : undefined,
				second.response === "going" ? "hockey" : undefined,
			].filter((partId) => partId !== undefined);
			const merged: MergedResponse = {
				...first,
				response: partIds.length ? "going" : first.response,
				partIds: partIds.length === 1 ? partIds : undefined,
			};
			assert(
				canManagePerson(state.account, member.id) ||
					(merged.response === first.response && !merged.partIds),
				"An unlinked player's partial RSVP needs manual review.",
			);
			return merged;
		});
		assert(
			responses.filter((response) => response.response === "going").length <=
				training.capacity,
			"Combined RSVPs exceed practice capacity.",
		);
		await client.mutation(api.club.apply, {
			action: {
				type: "edit-event",
				eventId: training.id,
				scope: "single",
				draft: {
					...eventDraft(training),
					title: "Thursday practice",
					end: hockey.end,
					repeat: "once",
					parts: [
						{
							id: "training",
							title: "Training",
							kind: "training",
							start: training.start,
							end: training.end,
						},
						{
							id: "hockey",
							title: "Hockey",
							kind: "hockey",
							start: hockey.start,
							end: hockey.end,
						},
					],
				},
			},
		});
		for (const response of responses) {
			const first = eventResponse(state.data, training.id, response.personId);
			const second = eventResponse(other.data, hockey.id, response.personId);
			if (first.attendance === "unmarked" && second.attendance === "unmarked")
				continue;
			for (const [partId, attendance] of [
				["training", first.attendance],
				["hockey", second.attendance],
			] as const)
				await client.mutation(api.club.apply, {
					action: {
						type: "attendance",
						eventId: training.id,
						personId: response.personId,
						partId,
						attendance,
					},
				});
		}
		for (const response of responses.filter(
			(entry) =>
				canManagePerson(state.account, entry.personId) &&
				(entry.partIds ||
					entry.response !==
						eventResponse(state.data, training.id, entry.personId).response),
		))
			await client.mutation(api.club.apply, {
				action: {
					type: "respond",
					eventId: training.id,
					personId: response.personId,
					response: response.response,
					partIds: response.partIds,
				},
			});
		const merged = await client.query(api.club.current, {
			screen: "session",
			id: training.id,
		});
		assert(merged);
		for (const expected of responses) {
			const saved = eventResponse(merged.data, training.id, expected.personId);
			assert.equal(saved.response, expected.response);
			assert.deepEqual(saved.partIds, expected.partIds);
			assert.equal(
				attendanceForPart(saved, "training"),
				eventResponse(state.data, training.id, expected.personId).attendance,
			);
			assert.equal(
				attendanceForPart(saved, "hockey"),
				eventResponse(other.data, hockey.id, expected.personId).attendance,
			);
		}
		await client.mutation(api.club.apply, {
			action: { type: "cancel-event", eventId: hockey.id },
		});
		console.log(
			"Combined the local demo Thursday practice and preserved RSVPs.",
		);
	}
	const fridayState = await client.query(api.club.current, {
		screen: "session",
		id: "hockey-fri-0",
	});
	if (!fridayState?.data.events.some((event) => event.id === "hockey-fri-0")) {
		const friday = initialAppData.events.find(
			(event) => event.id === "hockey-fri",
		);
		assert(friday);
		await client.mutation(api.club.apply, {
			action: {
				type: "create-event",
				id: "hockey-fri",
				draft: eventDraft(friday),
			},
		});
		console.log("Added a simple Friday hockey example.");
	}
} finally {
	await client.action(api.auth.signOut, {});
}
