import { type ReactElement, useState } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { Button } from "../design-system";
import { MemberProfileDialog } from "./member-profile-dialog";
import { useReviewFlow } from "./use-review-flow";

export const MemberProfileEditor = ({
	state,
	photoOnly = false,
}: {
	state: MemberProfileState;
	photoOnly?: boolean;
}): ReactElement | undefined => {
	const reviewFlow = useReviewFlow();
	const [editing, setEditing] = useState(
		!photoOnly &&
			["profile-edit", "profile-photo-crop"].includes(reviewFlow ?? ""),
	);
	return (
		<>
			{state.profile?.canEdit ? (
				<Button
					label={photoOnly ? "Change picture" : "Edit info"}
					prefix={photoOnly ? "image" : undefined}
					variant="secondary"
					onPress={(): void => setEditing(true)}
				/>
			) : undefined}
			{editing ? (
				<MemberProfileDialog
					name={state.profile?.name ?? "profile"}
					state={state}
					photoOnly={photoOnly}
					onClose={(): void => setEditing(false)}
				/>
			) : undefined}
		</>
	);
};
