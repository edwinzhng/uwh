import { ContextMenu } from "@base-ui/react/context-menu";
import { type ReactElement, useRef, useState } from "react";
import { contextMenuKey } from "./context-menu-policy";
import type { ContextActionMenuProps } from "./context-menu-props";
import { ContextMenuTrigger } from "./context-menu-trigger.web";
import { MenuItems } from "./menu-items.web";
import { usePopupContainer } from "./popup-container";
import { space } from "./tokens";

const interactiveTarget = (target: EventTarget | null): boolean =>
	target instanceof Element &&
	Boolean(
		target.closest(
			'button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="radio"], [role="switch"]',
		),
	);

export const ContextActionMenu = ({
	label,
	groups,
	isDisabled,
	children,
}: ContextActionMenuProps): ReactElement => {
	const container = usePopupContainer();
	const root = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const show = (): void => {
		const element = root.current;
		if (!element || isDisabled) return;
		const active = element.ownerDocument.activeElement;
		const anchor =
			active instanceof Element && element.contains(active) ? active : element;
		const bounds = anchor.getBoundingClientRect();
		element.dispatchEvent(
			new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: bounds.x + bounds.width / 2,
				clientY: bounds.y + bounds.height / 2,
			}),
		);
	};
	return (
		<ContextMenu.Root open={open} onOpenChange={setOpen} disabled={isDisabled}>
			<ContextMenu.Trigger
				ref={root}
				role="article"
				tabIndex={isDisabled ? undefined : 0}
				aria-label={label}
				className="club-message-context"
				onTouchStart={(event): void => {
					if (interactiveTarget(event.target)) event.preventBaseUIHandler();
				}}
				onKeyDown={(event): void => {
					if (!contextMenuKey(event.key, event.shiftKey)) return;
					event.preventDefault();
					event.preventBaseUIHandler();
					show();
				}}
			>
				{children({
					open: show,
					triggerFocused: focused,
					surface: (content) => content,
					trigger: (
						<ContextMenuTrigger
							label={label}
							isOpen={open}
							isFocused={focused}
							isDisabled={isDisabled}
							onOpen={show}
							onFocusChange={setFocused}
						/>
					),
				})}
			</ContextMenu.Trigger>
			<ContextMenu.Portal container={container}>
				<ContextMenu.Positioner
					className="club-popup-positioner"
					collisionPadding={space.xs}
				>
					<ContextMenu.Popup
						className="club-popup club-menu-popup"
						data-club-popup
					>
						<MenuItems groups={groups} isDisabled={isDisabled} />
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
};
