"use client";
import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
export const Dialog = ({
	open,
	onClose,
	title,
	content,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	content: ReactNode;
}): ReactElement => {
	const dialog = useRef<HTMLDialogElement>(null);
	const [opened, setOpened] = useState(false);
	useEffect((): void => {
		if (open) {
			setOpened(true);
			dialog.current?.showModal();
		} else dialog.current?.close();
	}, [open]);
	return (
		<dialog
			ref={dialog}
			onClose={onClose}
			className="join-dialog"
			aria-label={title}
			onClick={(event): void => {
				if (event.target === event.currentTarget) dialog.current?.close();
			}}
			onKeyDown={(event): void => {
				if (event.key === "Escape" && !event.defaultPrevented)
					dialog.current?.close();
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
	);
};
