"use client";
import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { Dialog } from "../design-system";
import { joinDialogOpen } from "../lib/join-dialog";
import { InterestForm } from "./interest-form";

export const JoinDialog = (): ReactElement => {
	const [open, setOpen] = useAtom(joinDialogOpen);
	return (
		<Dialog
			title="Registration"
			open={open}
			onClose={(): void => setOpen(false)}
			content={<InterestForm />}
		/>
	);
};
