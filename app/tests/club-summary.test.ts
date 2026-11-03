import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import { registeredMemberCount } from "../src/domain/club-summary";
import { defaultSeasonId } from "../src/domain/seasons";

test("registered total uses season decisions and excludes archived or merged people", (): void => {
	const member = initialAppData.members.at(0);
	if (!member) throw new Error("Missing fixture");
	const members = [
		{ ...member, id: "approved", registration: "approved" as const },
		{ ...member, id: "overridden", registration: "approved" as const },
		{ ...member, id: "newly-approved", registration: "submitted" as const },
		{
			...member,
			id: "archived",
			registration: "approved" as const,
			archived: true,
		},
		{
			...member,
			id: "merged",
			registration: "approved" as const,
			mergedInto: "approved",
		},
	];
	expect(
		registeredMemberCount(members, defaultSeasonId, [
			{ personId: "overridden", registration: "missing" },
			{ personId: "newly-approved", registration: "approved" },
		]),
	).toBe(2);
	expect(registeredMemberCount(members, "other-season", [])).toBe(0);
	expect(
		registeredMemberCount(members, "other-season", [
			{ personId: "approved", registration: "approved" },
		]),
	).toBe(1);
});
