"use client";
import { Button } from "@calgarycrocs/design-system/button";
import dynamic from "next/dynamic";
import { type ReactElement, type ReactNode, useRef, useState } from "react";

const InterestForm = dynamic(
	() => import("./interest-form").then((module) => module.InterestForm),
	{ loading: () => <p>Loading registration…</p> },
);
export const JoinButton = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}): ReactElement => {
	const dialog = useRef<HTMLDialogElement>(null);
	const [opened, setOpened] = useState(false);
	return (
		<>
			<Button
				type="button"
				className={className}
				onClick={() => {
					setOpened(true);
					dialog.current?.showModal();
				}}
			>
				<span className="join-label">{children}</span>
			</Button>
			<dialog
				ref={dialog}
				className="join-dialog"
				aria-label="Registration"
				onClick={(event) => {
					if (event.target === event.currentTarget) dialog.current?.close();
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape") dialog.current?.close();
				}}
			>
				<div className="dialog-content">
					<div className="dialog-heading">
						<h2>Registration</h2>
						<button
							type="button"
							aria-label="Close registration"
							onClick={() => dialog.current?.close()}
						>
							×
						</button>
					</div>
					{opened ? <InterestForm /> : undefined}
				</div>
			</dialog>
		</>
	);
};
