import { expect, test } from "bun:test";
import type { MemberProfile } from "../src/domain/member-profile";
import { memberProfileEditorPhase } from "../src/features/member-profile-editor-state";

const profile: MemberProfile = {
	personId: "self",
	name: "Fictional member",
	revision: 2,
	canEdit: true,
	contact: { email: "private@example.test", phone: "" },
};

test("profile editor loading and revoked permissions never expose an editable stale contact draft", (): void => {
	expect(memberProfileEditorPhase({ loading: true })).toEqual({
		kind: "loading",
	});
	expect(memberProfileEditorPhase({ loading: true, profile })).toEqual({
		kind: "loading",
	});
	expect(memberProfileEditorPhase({ loading: false, profile })).toEqual({
		kind: "ready",
		profile,
	});
	expect(
		memberProfileEditorPhase({
			loading: false,
			profile: { ...profile, canEdit: false },
		}),
	).toEqual({ kind: "unavailable" });
	expect(memberProfileEditorPhase({ loading: false })).toEqual({
		kind: "unavailable",
	});
});

test("household rows stay query-free and exactly one selected editor boundary owns the profile query", async (): Promise<void> => {
	const [row, list, live, session] = await Promise.all(
		[
			"household-profile-row",
			"household-profiles",
			"member-profile-live",
			"member-profile-session",
		].map((name) => Bun.file(`src/features/${name}.tsx`).text()),
	);
	expect(row).not.toContain("HouseholdInfoAction");
	expect(row).not.toContain("MemberProfile");
	expect(row).toContain("title={profile.name}");
	expect(row).toContain("avatar={profile.name}");
	expect(list?.match(/<HouseholdInfoAction\b/gu)).toHaveLength(1);
	expect(list?.indexOf("<HouseholdInfoAction")).toBeGreaterThan(
		list?.indexOf("</List>") ?? Number.POSITIVE_INFINITY,
	);
	expect(list).toContain("{editing ? (");
	expect(live?.match(/useLiveMemberProfile\(member\)/gu)).toHaveLength(1);
	expect(session).toContain("const [snapshot] = useState(profile)");
	expect(session).toContain("profile={snapshot}");
});
