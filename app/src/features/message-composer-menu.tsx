import type { ReactElement } from "react";
import { ActionMenu } from "../design-system";

export const MessageComposerMenu = ({
	disabled,
	onPhoto,
	onFile,
	onPoll,
	photoDisabled,
}: {
	disabled: boolean;
	onPhoto: () => void;
	onFile: () => void;
	onPoll: () => void;
	photoDisabled: boolean;
}): ReactElement => (
	<ActionMenu
		label="Message options"
		icon="plus"
		isDisabled={disabled}
		groups={[
			{
				id: "add",
				items: [
					{
						id: "photo",
						label: "Photos",
						icon: "image",
						isDisabled: photoDisabled,
						onSelect: onPhoto,
					},
					{
						id: "file",
						label: "Files",
						icon: "download",
						isDisabled: photoDisabled,
						onSelect: onFile,
					},
					{
						id: "poll",
						label: "Polls",
						icon: "barChart",
						onSelect: onPoll,
					},
				],
			},
		]}
	/>
);
