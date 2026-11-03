import type { MemberProfileState } from "../backend/use-member-profile";
import type { MemberProfile } from "../domain/member-profile";

export type ProfileEditorPhase =
	| { kind: "loading" }
	| { kind: "unavailable" }
	| { kind: "ready"; profile: MemberProfile };
export const memberProfileEditorPhase = (
	state: Pick<MemberProfileState, "loading" | "profile">,
): ProfileEditorPhase =>
	state.loading
		? { kind: "loading" }
		: state.profile?.canEdit
			? { kind: "ready", profile: state.profile }
			: { kind: "unavailable" };
