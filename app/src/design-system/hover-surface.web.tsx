import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import { useTheme } from "./theme";
import { corners, motion } from "./tokens";
import { useMotion } from "./use-motion";

export const HoverSurface = ({
	children,
	selector = ".club-popup-item",
}: {
	children: ReactNode;
	selector?: string;
}): ReactElement => {
	const rootRef = useRef<HTMLDivElement>(null);
	const highlightRef = useRef<HTMLDivElement>(null);
	const theme = useTheme();
	const canAnimate = useMotion();
	useEffect(() => {
		const root = rootRef.current;
		const highlight = highlightRef.current;
		if (!root || !highlight) return;
		const hover = matchMedia("(hover: hover) and (pointer: fine)");
		const state: {
			target?: HTMLElement;
			animation?: Animation;
			frame?: number;
			pointer: boolean;
		} = { pointer: false };
		const clear = (): void => {
			state.target = undefined;
			state.animation?.cancel();
			highlight.style.opacity = "0";
			delete root.dataset.sharedHover;
		};
		const place = (animate: boolean): void => {
			const target = state.target;
			if (
				!target?.isConnected ||
				!root.contains(target) ||
				target.hasAttribute("data-disabled") ||
				target.getAttribute("aria-disabled") === "true"
			) {
				clear();
				return;
			}
			const parent = root.getBoundingClientRect();
			const bounds = target.getBoundingClientRect();
			const targetStyle = getComputedStyle(target);
			highlight.style.borderRadius = targetStyle.borderRadius;
			const transform = `translate3d(${bounds.left - parent.left + root.scrollLeft}px,${bounds.top - parent.top + root.scrollTop}px,0)`;
			const previous = getComputedStyle(highlight).transform;
			state.animation?.cancel();
			highlight.style.width = `${bounds.width}px`;
			highlight.style.height = `${bounds.height}px`;
			highlight.style.background =
				targetStyle.getPropertyValue("--row-highlight").trim() ||
				theme.navigation.hover;
			highlight.style.transform = transform;
			highlight.style.opacity = "1";
			root.dataset.sharedHover = "true";
			if (animate && canAnimate && previous !== "none")
				state.animation = highlight.animate(
					[{ transform: previous }, { transform }],
					{
						duration: motion.duration.fast,
						easing: `cubic-bezier(${motion.easing.out.join(",")})`,
					},
				);
		};
		const eligible = (element: Element | null): element is HTMLElement =>
			element instanceof HTMLElement &&
			root.contains(element) &&
			!element.hasAttribute("data-disabled") &&
			element.getAttribute("aria-disabled") !== "true";
		const select = (target: HTMLElement, animate: boolean): void => {
			if (state.target === target) return;
			const moving = Boolean(state.target);
			state.target = target;
			place(animate && moving);
		};
		const pointer = (event: PointerEvent): void => {
			if (!hover.matches || event.pointerType !== "mouse") return;
			state.pointer = true;
			const target =
				event.target instanceof Element ? event.target.closest(selector) : null;
			if (eligible(target)) select(target, true);
			else if (target) clear();
		};
		const keyboard = (): void => {
			state.pointer = false;
			clear();
		};
		const highlighted = (): void => {
			if (state.pointer) return;
			const target = root.querySelector(`${selector}[data-highlighted]`);
			if (eligible(target)) select(target, false);
		};
		const reposition = (): void => {
			if (state.frame !== undefined) cancelAnimationFrame(state.frame);
			state.frame = requestAnimationFrame(() => {
				state.frame = undefined;
				if (state.target) place(false);
			});
		};
		const resize = new ResizeObserver(reposition);
		const observeRows = (): void => {
			resize.disconnect();
			resize.observe(root);
			for (const row of Array.from(root.querySelectorAll(selector)))
				resize.observe(row);
		};
		const changes = new MutationObserver((records): void => {
			if (state.target && !eligible(state.target)) clear();
			if (records.some((record) => record.type === "childList")) {
				observeRows();
				reposition();
			}
			highlighted();
		});
		observeRows();
		changes.observe(root, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["data-highlighted", "data-disabled", "aria-disabled"],
		});
		root.addEventListener("pointerover", pointer);
		root.addEventListener("pointerleave", clear);
		root.addEventListener("keydown", keyboard, true);
		root.addEventListener("scroll", reposition, true);
		hover.addEventListener("change", clear);
		return (): void => {
			clear();
			if (state.frame !== undefined) cancelAnimationFrame(state.frame);
			resize.disconnect();
			changes.disconnect();
			root.removeEventListener("pointerover", pointer);
			root.removeEventListener("pointerleave", clear);
			root.removeEventListener("keydown", keyboard, true);
			root.removeEventListener("scroll", reposition, true);
			hover.removeEventListener("change", clear);
		};
	}, [canAnimate, selector, theme.navigation.hover]);
	return (
		<div ref={rootRef} className="club-hover-surface">
			<div
				ref={highlightRef}
				aria-hidden="true"
				className="club-moving-highlight"
				style={{
					borderRadius:
						selector === '[role="tab"]' ? corners.navigation : corners.menuRow,
				}}
			/>
			{children}
		</div>
	);
};
