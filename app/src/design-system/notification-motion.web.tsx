import { type ReactElement, useEffect, useRef } from "react";
import type { NotificationMotionProps } from "./notification-motion-props";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
export const NotificationMotion = ({
	count,
	kind,
	children,
}: NotificationMotionProps): ReactElement => {
	const enabled = useMotion();
	const node = useRef<HTMLDivElement>(null);
	const previous = useRef(count);
	useEffect(() => {
		const old = previous.current;
		previous.current = count;
		if (
			!enabled ||
			!node.current ||
			old === count ||
			(kind === "bell" && count < old)
		)
			return;
		const angle = Math.min(24, 10 + (count - old) * 2);
		const frames =
			kind === "bell"
				? [
						{ transform: "rotate(0deg)" },
						{ transform: `rotate(${angle}deg)` },
						{ transform: `rotate(${-angle * 0.65}deg)` },
						{ transform: `rotate(${angle * 0.3}deg)` },
						{ transform: "rotate(0deg)" },
					]
				: [
						{ transform: `translateY(${count > old ? 8 : -8}px)`, opacity: 0 },
						{ transform: "translateY(0px)", opacity: 1 },
					];
		const playback = node.current.animate(frames, {
			duration:
				kind === "bell" ? motion.duration.extended : motion.duration.fast,
			easing: `cubic-bezier(${motion.easing.out.join(",")})`,
		});
		return (): void => playback.cancel();
	}, [count, kind, enabled]);
	return (
		<div
			ref={node}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transformOrigin: "50% 15%",
			}}
		>
			{children}
		</div>
	);
};
