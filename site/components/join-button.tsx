"use client";
import { useSetAtom } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { Button } from "../design-system";
import { joinDialogOpen } from "../lib/join-dialog";

export const JoinButton = ({
	children,
	variant,
}: {
	children: ReactNode;
	variant?: "primary" | "navigation";
}): ReactElement => {
	const setOpen = useSetAtom(joinDialogOpen);
	return (
		<Button type="button" variant={variant} onClick={(): void => setOpen(true)}>
			{children}
		</Button>
	);
};
