"use client";
import { Button } from "@calgarycrocs/design-system/button";
import { type ReactElement, type ReactNode, useRef } from "react";
import { InterestForm } from "./interest-form";
export const JoinButton = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}): ReactElement => {
	const dialog = useRef<HTMLDialogElement>(null);
	return (
		<>
			<Button
				type="button"
				className={className}
				onClick={() => dialog.current?.showModal()}
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
					<InterestForm />
				</div>
			</dialog>
		</>
	);
};
