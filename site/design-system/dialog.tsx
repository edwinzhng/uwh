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
	const [closing, setClosing] = useState(false);
	const close = (): void => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			dialog.current?.close();
		else setClosing(true);
	};
	useEffect((): void => {
		if (open) {
			if (!opened) {
				setOpened(true);
				return;
			}
			dialog.current?.showModal();
			dialog.current
				?.querySelector<HTMLInputElement>(
					'input:not([type="hidden"]):not([disabled])',
				)
				?.focus({ preventScroll: true });
		} else dialog.current?.close();
	}, [open, opened]);
	return (
		<dialog
			ref={dialog}
			onClose={(): void => {
				setClosing(false);
				onClose();
			}}
			data-closing={closing || undefined}
			onAnimationEnd={(event): void => {
				if (
					event.target === event.currentTarget &&
					event.animationName === "modal-exit"
				)
					dialog.current?.close();
			}}
			className="join-dialog"
			aria-label={title}
			onClick={(event): void => {
				if (event.target === event.currentTarget) close();
			}}
			onCancel={(event): void => {
				event.preventDefault();
				close();
			}}
			onKeyDown={(event): void => {
				if (event.key === "Escape" && !event.defaultPrevented) {
					event.preventDefault();
					close();
				}
			}}
		>
			<div className="dialog-content">
				<div className="dialog-heading">
					<h2>{title}</h2>
					<button
						type="button"
						aria-label={`Close ${title.toLowerCase()}`}
						onClick={close}
					>
						×
					</button>
				</div>
				{opened ? content : undefined}
			</div>
		</dialog>
	);
};
