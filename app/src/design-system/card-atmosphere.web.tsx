import { type ReactElement, useEffect, useRef } from "react";
import {
	motionDurationSeconds,
	motionEasingCss,
} from "../../../packages/design-system/src/motion";
import { useTheme } from "./theme";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";

export const CardAtmosphere = (): ReactElement => {
	const host = useRef<HTMLDivElement>(null);
	const light = useRef<HTMLDivElement>(null);
	const theme = useTheme();
	const enabled = useMotion();
	const color = theme.mode === "dark" ? "210,251,98" : "86,110,38";
	useEffect(() => {
		const owner = host.current?.parentElement;
		const glow = light.current;
		if (!owner || !glow) return;
		const pending = { frame: 0, timeout: 0 };
		const hide = (): void => {
			cancelAnimationFrame(pending.frame);
			window.clearTimeout(pending.timeout);
			glow.style.opacity = "0";
		};
		const show = (x: number, y: number): void => {
			window.clearTimeout(pending.timeout);
			const rect = owner.getBoundingClientRect();
			glow.style.transform = `translate(${(enabled ? x - rect.left : rect.width / 2) - 180}px, ${(enabled ? y - rect.top : rect.height / 2) - 180}px)`;
			glow.style.opacity = "1";
		};
		const nearest = (event: Event): boolean =>
			event.target instanceof Element &&
			event.target.closest("[data-card-atmosphere]") === owner;
		const move = (event: PointerEvent): void => {
			if (
				event.pointerType !== "mouse" ||
				!matchMedia("(hover: hover)").matches ||
				!nearest(event)
			)
				return;
			cancelAnimationFrame(pending.frame);
			pending.frame = requestAnimationFrame((): void =>
				show(event.clientX, event.clientY),
			);
		};
		const down = (event: PointerEvent): void => {
			if (!nearest(event)) return;
			window.clearTimeout(pending.timeout);
			show(event.clientX, event.clientY);
		};
		const release = (): void => {
			pending.timeout = window.setTimeout(hide, motion.duration.extended);
		};
		const focus = (event: FocusEvent): void => {
			if (!nearest(event)) return;
			const rect = owner.getBoundingClientRect();
			show(rect.left + rect.width / 2, rect.top + rect.height / 2);
		};
		owner.setAttribute("data-card-atmosphere", "true");
		owner.addEventListener("pointermove", move, { passive: true });
		owner.addEventListener("pointerdown", down, { passive: true });
		owner.addEventListener("pointerup", release, { passive: true });
		owner.addEventListener("pointerleave", hide);
		owner.addEventListener("pointercancel", hide);
		owner.addEventListener("focusin", focus);
		owner.addEventListener("focusout", hide);
		return (): void => {
			cancelAnimationFrame(pending.frame);
			window.clearTimeout(pending.timeout);
			owner.removeEventListener("pointermove", move);
			owner.removeEventListener("pointerdown", down);
			owner.removeEventListener("pointerup", release);
			owner.removeEventListener("pointerleave", hide);
			owner.removeEventListener("pointercancel", hide);
			owner.removeEventListener("focusin", focus);
			owner.removeEventListener("focusout", hide);
			owner.removeAttribute("data-card-atmosphere");
		};
	}, [enabled]);
	return (
		<div
			ref={host}
			aria-hidden="true"
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				borderRadius: "inherit",
				pointerEvents: "none",
				background: `radial-gradient(ellipse at 100% 0%,rgba(${color},0.025),transparent 65%)`,
			}}
		>
			<div
				ref={light}
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 360,
					height: 360,
					opacity: 0,
					pointerEvents: "none",
					background: `radial-gradient(circle,rgba(${color},0.06),rgba(${color},0.02) 32%,transparent 70%)`,
					transition: enabled
						? `opacity ${motionDurationSeconds("fast")}s ${motionEasingCss("out")}`
						: "none",
				}}
			/>
		</div>
	);
};
