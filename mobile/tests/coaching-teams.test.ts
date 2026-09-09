import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { eventAttendees, lineupNeedsReview } from "../src/domain/app-rules";
import { visibleAppData } from "../src/domain/app-visibility";
import { generatePreviewTeams, type Player } from "../src/domain/club";
import {
	defaultPlayerCoaching,
	formatTeams,
	type Position,
	validatePlayerCoaching,
} from "../src/domain/player-coaching";

const player = (
	id: string,
	rating: number,
	positions: Position[],
	youth = false,
): Player => ({
	id,
	name: id,
	rating,
	positions,
	position: "",
	ageGroup: youth ? "youth" : "adult",
	response: "going",
	attendance: "unmarked",
});
test("teams balance positions and ratings while respecting multiple preferences", (): void => {
	const roster = [
		player("a", 100, ["FORWARD"]),
		player("b", 90, ["FORWARD"]),
		player("c", 80, ["FULL_BACK"]),
		player("d", 70, ["FULL_BACK"]),
		player("e", 60, ["WING", "CENTER"]),
		player("f", 50, ["WING", "CENTER"]),
	];
	const teams = generatePreviewTeams(roster);
	for (const team of [teams.black, teams.white]) {
		expect(team.length).toBe(3);
		expect(
			team.filter((entry) => entry.assignedPosition === "FORWARD"),
		).toHaveLength(1);
		expect(
			team.filter((entry) => entry.assignedPosition === "FULL_BACK"),
		).toHaveLength(1);
		for (const entry of team)
			expect(entry.positions).toContain(entry.assignedPosition);
	}
	expect(
		Math.abs(
			teams.black.reduce((sum, entry) => sum + entry.rating, 0) -
				teams.white.reduce((sum, entry) => sum + entry.rating, 0),
		),
	).toBeLessThanOrEqual(30);
	expect(generatePreviewTeams(roster.toReversed())).toEqual(teams);
});
test("separate youth distributes both cohorts independently and exclusions never change attendance", (): void => {
	const roster = [
		player("a", 80, ["FORWARD"]),
		player("b", 70, ["FORWARD"]),
		player("c", 60, ["FORWARD"], true),
		player("d", 50, ["FORWARD"], true),
		player("e", 40, ["FORWARD"], true),
	];
	const teams = generatePreviewTeams(roster, {
		separateYouth: true,
		excludedPersonIds: ["e"],
	});
	for (const team of [teams.black, teams.white])
		expect(team.map((entry) => entry.ageGroup).toSorted()).toEqual([
			"adult",
			"youth",
		]);
	expect(roster.at(-1)?.response).toBe("going");
	expect(
		[...teams.black, ...teams.white].some((entry) => entry.id === "e"),
	).toBe(false);
});
test("saved exclusions preserve the RSVP snapshot and reject excluded player reassignment", (): void => {
	const attendees = eventAttendees(initialAppData, "club-thu");
	const excluded = attendees.at(0);
	if (!excluded) throw new Error("Missing fixture");
	const generated = reduceApp(initialAppData, primaryAccount, {
		type: "generate-teams",
		eventId: "club-thu",
		excludedPersonIds: [excluded.id],
	});
	const plan = generated.teams.find((entry) => entry.eventId === "club-thu");
	if (!plan) throw new Error("Missing teams");
	expect(generated.responses).toEqual(initialAppData.responses);
	expect(plan.attendees).toHaveLength(attendees.length);
	expect([...plan.black, ...plan.white]).not.toContain(excluded.id);
	expect(lineupNeedsReview(generated, plan)).toBe(false);
	expect(() =>
		reduceApp(generated, primaryAccount, {
			type: "move-player",
			eventId: "club-thu",
			personId: excluded.id,
		}),
	).toThrow();
	const changed = {
		...generated,
		responses: generated.responses.map((entry) =>
			entry.personId === excluded.id && entry.eventId === "club-thu"
				? { ...entry, response: "unavailable" as const }
				: entry,
		),
	};
	expect(lineupNeedsReview(changed, plan)).toBe(true);
	expect(() =>
		reduceApp(changed, primaryAccount, {
			type: "publish-teams",
			eventId: "club-thu",
		}),
	).toThrow();
});
test("position edits unpublish teams and are coach-only; copy includes positions without ratings", (): void => {
	const generated = reduceApp(initialAppData, primaryAccount, {
		type: "generate-teams",
		eventId: "club-thu",
	});
	const published = reduceApp(generated, primaryAccount, {
		type: "publish-teams",
		eventId: "club-thu",
	});
	const first = published.teams
		.find((entry) => entry.eventId === "club-thu")
		?.black.at(0);
	if (!first) throw new Error("Missing player");
	const action = {
		type: "assign-position",
		eventId: "club-thu",
		personId: first,
		position: "FULL_BACK",
	} as const;
	const updated = reduceApp(published, primaryAccount, action);
	const plan = updated.teams.find((entry) => entry.eventId === "club-thu");
	if (!plan) throw new Error("Missing teams");
	expect(plan.published).toBe(false);
	expect(
		plan.assignments?.find((entry) => entry.personId === first)?.position,
	).toBe("FULL_BACK");
	expect(formatTeams(plan, updated.members)).toContain("Full back ·");
	expect(formatTeams(plan, updated.members)).not.toContain("Rating");
	expect(() =>
		reduceApp(published, { ...primaryAccount, coachPrograms: [] }, action),
	).toThrow();
});
test("private coaching data is hidden from admins without coach permission", (): void => {
	const member = initialAppData.members.at(0);
	if (!member) throw new Error("Missing player");
	const profile = { ...defaultPlayerCoaching(member), rating: 99 };
	const data = { ...initialAppData, playerCoaching: [profile] };
	expect(
		visibleAppData(data, { ...primaryAccount, coachPrograms: [] })
			.playerCoaching,
	).toBeUndefined();
	expect(visibleAppData(data, primaryAccount).playerCoaching).toEqual([
		profile,
	]);
	expect(() =>
		validatePlayerCoaching({ ...profile, rating: Number.NaN }),
	).toThrow();
	expect(() =>
		validatePlayerCoaching({ ...profile, positions: ["WING", "WING"] }),
	).toThrow();
});
