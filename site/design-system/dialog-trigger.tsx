"use client";
import { type ReactElement, type ReactNode, useRef, useState } from "react";
import { Button } from "./controls";
export const DialogTrigger = ({
	children,
	title,
	content,
	variant,
}: {
	children: ReactNode;
	title: string;
	content: ReactNode;
	variant?: "primary" | "navigation";
}): ReactElement => {
	const dialog = useRef<HTMLDialogElement>(null);
	const [opened, setOpened] = useState(false);
	return (
		<>
			<Button
				variant={variant}
				type="button"
				onClick={(): void => {
					setOpened(true);
					dialog.current?.showModal();
				}}
			>
				{children}
			</Button>
			<dialog
				ref={dialog}
				className="join-dialog"
				aria-label={title}
				onClick={(event): void => {
					if (event.target === event.currentTarget) dialog.current?.close();
				}}
				onKeyDown={(event): void => {
					if (event.key === "Escape") dialog.current?.close();
				}}
			>
				<div className="dialog-content">
					<div className="dialog-heading">
						<h2>{title}</h2>
						<button
							type="button"
							aria-label={`Close ${title.toLowerCase()}`}
							onClick={(): void => dialog.current?.close()}
						>
							×
						</button>
					</div>
					{opened ? content : undefined}
				</div>
			</dialog>
		</>
	);
};
