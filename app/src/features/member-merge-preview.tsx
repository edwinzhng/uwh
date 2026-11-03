import type { ReactElement } from "react";
import { usePreviewMemberMerge } from "../backend/use-member-merge";
import type { MemberMergeInput } from "../demo/member-merge-state";
import { Text } from "../design-system";
import { MemberMergeConfirm } from "./member-merge-confirm";

export const MemberMergePreview = ({
	input,
	onClose,
	onBusyChange,
}: {
	input: MemberMergeInput;
	onClose: () => void;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const service = usePreviewMemberMerge(input);
	return service.preview ? (
		<MemberMergeConfirm
			preview={service.preview}
			service={service}
			fillEmptyProfile={input.fillEmptyProfile}
			onClose={onClose}
			onBusyChange={onBusyChange}
		/>
	) : (
		<Text tone="secondary">Checking member history…</Text>
	);
};
