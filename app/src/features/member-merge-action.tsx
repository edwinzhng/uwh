import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Checkbox, Dialog, List, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { MemberMergeLive } from "./member-merge-live";
import { MemberMergePreview } from "./member-merge-preview";
import { MemberMergeTargets } from "./member-merge-targets";
import { useReviewFlow } from "./use-review-flow";

export const MemberMergeAction = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => {
	const { account, source, data } = useApp();
	const reviewFlow = useReviewFlow();
	const review =
		source === "preview" &&
		["member-merge", "member-merge-conflicts"].includes(reviewFlow ?? "");
	const [open, setOpen] = useState(review);
	const [target, setTarget] = useState<Member | undefined>(() =>
		review ? data.members.find((row) => row.id === "sam") : undefined,
	);
	const [fillEmptyProfile, setFillEmptyProfile] = useState(false);
	const [busy, setBusy] = useState(false);
	if (!account.admin || !member.archived || member.mergedInto) return undefined;
	const close = (): void => {
		setOpen(false);
		setTarget(undefined);
		setFillEmptyProfile(false);
	};
	const input = target
		? { sourceId: member.id, targetId: target.id, fillEmptyProfile }
		: undefined;
	return (
		<>
			<Button
				label="Merge into active member"
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				intent="form"
				isDismissDisabled={busy}
				title={`Merge ${member.name}`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!value && !busy) close();
				}}
				footer={false}
			>
				<List>
					{input ? (
						<>
							<Button
								label="Choose a different member"
								variant="ghost"
								isDisabled={busy}
								onPress={(): void => setTarget(undefined)}
							/>
							<Checkbox
								label="Fill empty cap, contact and photo fields from the archived profile"
								checked={fillEmptyProfile}
								onChange={setFillEmptyProfile}
								isDisabled={busy}
							/>
							{source === "convex" ? (
								<MemberMergeLive
									key={`${target?.id}:${fillEmptyProfile}`}
									input={input}
									onClose={close}
									onBusyChange={setBusy}
								/>
							) : (
								<MemberMergePreview
									key={`${target?.id}:${fillEmptyProfile}`}
									input={input}
									onClose={close}
									onBusyChange={setBusy}
								/>
							)}
						</>
					) : (
						<>
							<Text variant="small" tone="secondary">
								Choose the active profile for this same person. Review all
								conflicts before combining history. The archived source is
								preserved.
							</Text>
							<MemberMergeTargets sourceId={member.id} onSelect={setTarget} />
						</>
					)}
				</List>
			</Dialog>
		</>
	);
};
