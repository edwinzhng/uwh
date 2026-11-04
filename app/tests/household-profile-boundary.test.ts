import { expect, test } from "bun:test";
import type { MemberProfile } from "../src/domain/member-profile";
import { memberProfileEditorPhase } from "../src/features/member-profile-editor-state";

const profile: MemberProfile = {
	personId: "self",
	name: "Fictional member",
	revision: 2,
	canEdit: true,
	canEditCapNumber: false,
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
