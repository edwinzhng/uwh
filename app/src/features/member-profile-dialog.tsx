import type { ReactElement } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { Dialog, LoadingContent, Text } from "../design-system";
import { memberProfileEditorPhase } from "./member-profile-editor-state";
import { MemberProfileSession } from "./member-profile-session";

export const MemberProfileDialog = ({
	name,
	state,
	onClose,
	photoOnly,
}: {
	name: string;
	state: MemberProfileState;
	onClose: () => void;
	photoOnly?: boolean;
}): ReactElement => {
	const phase = memberProfileEditorPhase(state);
	return phase.kind !== "ready" ? (
		<Dialog
			title={phase.kind === "loading" ? `Edit ${name}` : "Profile unavailable"}
			isOpen
			onOpenChange={(open): void => {
				if (!open) onClose();
			}}
		>
			{phase.kind === "loading" ? (
				<LoadingContent />
			) : (
				<Text>Your access to edit this profile is no longer available.</Text>
			)}
		</Dialog>
	) : (
		<MemberProfileSession
			profile={phase.profile}
			photoOnly={photoOnly}
			state={state}
			onClose={onClose}
		/>
	);
};
