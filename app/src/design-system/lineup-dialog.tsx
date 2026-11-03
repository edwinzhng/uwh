import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { SectionHeading } from "./section-heading";

export const LineupDialog = ({
	children,
	label,
	openRequest,
}: {
	children: ReactNode;
	label: string;
	openRequest?: number;
}): ReactElement => {
	const [open, setOpen] = useState(openRequest !== undefined);
	useEffect((): void => {
		if (openRequest !== undefined) setOpen(true);
	}, [openRequest]);
	return (
		<>
			<SectionHeading
				action={
					<Button
						label={label}
						variant="secondary"
						onPress={(): void => setOpen(true)}
					/>
				}
			>
				Teams
			</SectionHeading>
			<Dialog
				isOpen={open}
				onOpenChange={setOpen}
				title="Lineup"
				intent="lineup"
			>
				{children}
			</Dialog>
		</>
	);
};
