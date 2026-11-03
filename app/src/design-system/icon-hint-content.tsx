import { type ReactElement, useState } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import type { IconName } from "./icon";
import { Text } from "./text";

export type IconHintProps = {
	label: string;
	text: string;
	icon: IconName;
	compact?: boolean;
};
export const IconHintContent = ({
	label,
	text,
	icon,
	compact = true,
}: IconHintProps): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label={label}
				icon={icon}
				compact={compact}
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title={label}
				isOpen={open}
				onOpenChange={setOpen}
				intent="detail"
			>
				<Text>{text}</Text>
			</Dialog>
		</>
	);
};
