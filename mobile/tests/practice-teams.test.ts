import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { eventAttendees, lineupNeedsReview } from "../src/domain/app-rules";
import type { AppData, TeamPlan } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";

const fixture = (): AppData => ({
	...initialAppData,
	events: initialAppData.events.map((event) =>
		event.id === "club-thu"
			? {
					...event,
					parts: [
						{
							id: "training",
							title: "Training",
							kind: "training",
							start: "19:45",
							end: "20:30",
						},
						{
							id: "hockey",
							title: "Hockey",
							kind: "hockey",
							start: "20:30",
							end: "21:30",
						},
					],
				}
			: event,
	),
	responses: initialAppData.responses.map((response) =>
		response.eventId === "club-thu" && response.personId === "alex"
			? { ...response, partIds: ["hockey"] }
			: response,
	),
});
const planFor = (data: AppData, partId?: string): TeamPlan => {
	const plan = data.teams.find(
		(entry) => entry.eventId === "club-thu" && entry.partId === partId,
	);
	if (!plan) throw new Error("Missing teams");
	return plan;
};
const generate = (data: AppData, partId?: string): AppData =>
	reduceApp(data, primaryAccount, {
		type: "generate-teams",
		eventId: "club-thu",
		partId,
	});

test("part lineups use selected players and their part attendance", (): void => {
	const data = fixture();
	expect(
		eventAttendees(data, "club-thu", "training").map((member) => member.id),
	).not.toContain("alex");
	expect(
		eventAttendees(data, "club-thu", "hockey").map((member) => member.id),
	).toContain("alex");
	const marked: AppData = {
		...data,
		responses: data.responses.map((entry) =>
			entry.personId === "robin" && entry.eventId === "club-thu"
				? {
						...entry,
						attendance: "unmarked",
						partAttendance: [{ partId: "training", attendance: "absent" }],
					}
				: entry,
		),
	};
	expect(
		eventAttendees(marked, "club-thu", "training").map((member) => member.id),
	).not.toContain("robin");
	expect(
		eventAttendees(marked, "club-thu", "hockey").map((member) => member.id),
	).toContain("robin");
});

test("part generation and publication preserve whole-practice and other-part plans", (): void => {
	const data = generate(generate(generate(fixture()), "training"), "hockey");
	expect(data.teams).toHaveLength(3);
	const published = reduceApp(data, primaryAccount, {
		type: "publish-teams",
		eventId: "club-thu",
		partId: "hockey",
	});
	expect(planFor(published, "hockey").published).toBe(true);
	expect(planFor(published, "training").published).toBe(false);
	expect(planFor(published).published).toBe(false);
	const regenerated = generate(published, "training");
	expect(planFor(regenerated, "hockey")).toEqual(planFor(published, "hockey"));
	expect(regenerated.teams).toHaveLength(3);
	const playerView = visibleAppData(published, {
		...primaryAccount,
		coachPrograms: [],
		admin: false,
	});
	expect(playerView.teams.map((plan) => plan.partId)).toEqual(["hockey"]);
});

test("selection changes stale only affected part lineups", (): void => {
	const data = generate(generate(fixture(), "training"), "hockey");
	const changed: AppData = {
		...data,
		responses: data.responses.map((entry) =>
			entry.personId === "alex" && entry.eventId === "club-thu"
				? { ...entry, partIds: undefined }
				: entry,
		),
	};
	expect(lineupNeedsReview(changed, planFor(changed, "training"))).toBe(true);
	expect(lineupNeedsReview(changed, planFor(changed, "hockey"))).toBe(false);
	expect(() =>
		reduceApp(changed, primaryAccount, {
			type: "publish-teams",
			eventId: "club-thu",
			partId: "training",
		}),
	).toThrow("Lineup changed");
	expect(() => generate(changed, "missing")).toThrow("Practice part not found");
	expect(() =>
		reduceApp(
			changed,
			{ ...primaryAccount, coachPrograms: [] },
			{ type: "generate-teams", eventId: "club-thu", partId: "hockey" },
		),
	).toThrow();
});

test("manual team and position changes apply only to their part", (): void => {
	const data = generate(generate(fixture(), "training"), "hockey");
	const personId = planFor(data, "hockey").black.at(0);
	if (!personId) throw new Error("Missing player");
	const moved = reduceApp(data, primaryAccount, {
		type: "move-player",
		eventId: "club-thu",
		partId: "hockey",
		personId,
	});
	expect(planFor(moved, "hockey").white).toContain(personId);
	expect(planFor(moved, "training")).toEqual(planFor(data, "training"));
	const assigned = reduceApp(moved, primaryAccount, {
		type: "assign-position",
		eventId: "club-thu",
		partId: "hockey",
		personId,
		position: "FULL_BACK",
	});
	expect(
		planFor(assigned, "hockey").assignments?.find(
			(entry) => entry.personId === personId,
		)?.position,
	).toBe("FULL_BACK");
	expect(planFor(assigned, "training")).toEqual(planFor(data, "training"));
});

test("changing practice parts unpublishes lineups and hides removed parts", (): void => {
	const data = generate(fixture(), "hockey");
	const event = data.events.find((entry) => entry.id === "club-thu");
	if (!event) throw new Error("Missing practice");
	const published = reduceApp(data, primaryAccount, {
		type: "publish-teams",
		eventId: event.id,
		partId: "hockey",
	});
	const updated = reduceApp(published, primaryAccount, {
		type: "edit-event",
		eventId: event.id,
		scope: "single",
		draft: { ...event, parts: undefined, repeat: "once" },
	});
	expect(planFor(updated, "hockey").published).toBe(false);
	expect(planFor(updated, "hockey").coachingStale).toBe(true);
	expect(visibleAppData(updated, primaryAccount).teams).toHaveLength(0);
});
