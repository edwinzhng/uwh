import { type ReactElement, useLayoutEffect, useRef } from "react";
import { pageMotionAllowed } from "./page-motion-input.web";
import type { SelectionIndicatorProps } from "./selection-indicator-props";
import { selectionTransition } from "./selection-transition";
import { geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

export const SelectionIndicator = ({
	frame,
	value,
	color,
	radius,
	borderColor,
}: SelectionIndicatorProps): ReactElement => {
	const enabled = useMotion();
	const element = useRef<HTMLDivElement>(null);
	const previous = useRef({ x: frame.x, width: frame.width, value });
	const animation = useRef<Animation | undefined>(undefined);
	useLayoutEffect((): void => {
		const node = element.current;
		const old = previous.current;
		previous.current = { x: frame.x, width: frame.width, value };
		if (!node) return;
		const bounds = node.getBoundingClientRect();
		const parent = node.parentElement?.getBoundingClientRect();
		const from = selectionTransition(
			old,
			{ x: frame.x, width: frame.width },
			{
				x: bounds.left - (parent?.left ?? 0),
				width: bounds.width,
			},
		);
		animation.current?.cancel();
		animation.current = undefined;
		if (!enabled || !pageMotionAllowed() || old.value === value) return;
		animation.current = node.animate(
			[
				{ transform: `translateX(${from.x}px) scaleX(${from.scale})` },
				{ transform: "translateX(0px) scaleX(1)" },
			],
			{
				duration: motion.duration.fast,
				easing: `cubic-bezier(${motion.easing.out.join(",")})`,
			},
		);
	}, [enabled, value, frame.x, frame.width]);
	useLayoutEffect(() => (): void => animation.current?.cancel(), []);
	return (
		<div
			ref={element}
			aria-hidden="true"
			style={{
				pointerEvents: "none",
				position: "absolute",
				left: frame.x,
				top: frame.y,
				width: frame.width,
				height: frame.height,
				transformOrigin: "left center",
				boxSizing: "border-box",
				borderRadius: radius,
				backgroundColor: color,
				border: borderColor
					? `${geometry.border}px solid ${borderColor}`
					: undefined,
			}}
		/>
	);
};
