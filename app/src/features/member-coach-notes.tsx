import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Stack, Text } from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { FeedbackList } from "./feedback-list";

export const MemberCoachNotes = ({
	member,
	onAdd,
}: {
	member: Member;
	onAdd: () => void;
}): ReactElement => {
	const { account } = useApp();
	const [open, setOpen] = useState(false);
	const coach = canCoachMember(account, member);
	return (
		<>
			<Button
				label="Coach notes"
				prefix="list"
				variant="secondary"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog title="Coach notes" isOpen={open} onOpenChange={setOpen}>
				<Stack>
					<Text variant="small">
						Shared notes are visible to this player and linked guardians.
					</Text>
					{coach ? (
						<Button
							label="Add note"
							prefix="plus"
							variant="secondary"
							onPress={(): void => {
								setOpen(false);
								onAdd();
							}}
						/>
					) : undefined}
					<FeedbackList personId={member.id} visibility="published" embedded />
					{coach ? (
						<FeedbackList
							personId={member.id}
							visibility="private"
							embedded
							hideEmpty
						/>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
