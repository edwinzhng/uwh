import { Popover } from "@base-ui/react/popover";
import type { KeyboardEvent, ReactElement } from "react";
import { reactionChoices } from "../domain/messaging";
import { Icon } from "./icon";
import type { MessageReactionProps } from "./message-reaction-props";
import { usePopupContainer } from "./popup-container";
import { ReactionContent } from "./reaction-content";
import { space } from "./tokens";

const moveFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
	const directions = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
	if (!(event.key in directions)) return;
	const buttons = Array.from(
		event.currentTarget.querySelectorAll<HTMLButtonElement>(
			"button:not(:disabled)",
		),
	);
	const current =
		document.activeElement instanceof HTMLButtonElement
			? buttons.indexOf(document.activeElement)
			: -1;
	const index =
		event.key === "Home"
			? 0
			: event.key === "End"
				? buttons.length - 1
				: (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
					buttons.length;
	event.preventDefault();
	buttons.at(index)?.focus();
};
export const MessageReactionTrigger = ({
	isOpen,
	isDisabled,
	mode,
	error,
	recent,
	selected,
	onPress,
	onClose,
	onAll,
	onSelect,
}: MessageReactionProps): ReactElement => {
	const container = usePopupContainer();
	return (
		<Popover.Root
			open={isOpen}
			onOpenChange={(open): void => {
				if (isDisabled) return;
				if (open) onPress();
				else onClose();
			}}
		>
			<Popover.Trigger
				className="club-message-reaction-trigger club-combo-action"
				aria-label="Add reaction"
				disabled={isDisabled}
			>
				<Icon name="reaction" size="sm" tone="secondary" />
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Positioner
					className="club-popup-positioner"
					side="top"
					align="center"
					sideOffset={space.xs}
					collisionPadding={space.xs}
				>
					<Popover.Popup
						className={`club-popup club-reaction-popup ${mode === "all" ? "club-reaction-full" : "club-reaction-quick"}`}
						data-club-popup
						aria-label={mode === "all" ? "All reactions" : "Quick reactions"}
					>
						{mode === "all" ? (
							<ReactionContent
								onSelect={onSelect}
								onClose={onClose}
								isDisabled={isDisabled}
								error={error}
								recent={recent}
								selected={selected}
							/>
						) : (
							<>
								<div
									role="toolbar"
									aria-label="Quick reactions"
									className="club-quick-reactions"
									onKeyDown={moveFocus}
								>
									{reactionChoices.slice(0, 5).map((choice) => (
										<button
											type="button"
											key={choice.emoji}
											className="club-quick-reaction"
											aria-label={choice.label}
											aria-pressed={selected.includes(choice.emoji)}
											disabled={isDisabled}
											onClick={(): void => onSelect(choice.emoji)}
										>
											<span>{choice.emoji}</span>
										</button>
									))}
									<button
										type="button"
										className="club-quick-reaction"
										aria-label="All reactions"
										disabled={isDisabled}
										onClick={onAll}
									>
										<Icon name="plus" size="sm" />
									</button>
								</div>
								{error ? (
									<p role="alert" className="club-reaction-error">
										{error}
									</p>
								) : undefined}
							</>
						)}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};
