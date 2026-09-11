"use client";
import { type ReactElement, useEffect, useRef } from "react";
import { createLiquidRenderer } from "../lib/liquid-renderer";
export const ButtonGlass = (): ReactElement => {
	const ref = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = ref.current;
		const button = canvas?.parentElement;
		if (!canvas || !button) return;
		const renderer = createLiquidRenderer(canvas, "button");
		if (!renderer) return;
		const state = { frame: 0, active: true, last: 0 };
		const points = new Float32Array(24).fill(0.5);
		const motion = matchMedia("(prefers-reduced-motion: reduce)");
		const draw = (time: number): void => {
			if (time - state.last > 32) {
				renderer.render(motion.matches ? 0 : time / 1000, 1, points);
				state.last = time;
			}
			if (state.active) state.frame = requestAnimationFrame(draw);
		};
		const resize = (): void => {
			const bounds = button.getBoundingClientRect();
			renderer.resize(bounds.width, bounds.height);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(button);
		resize();
		const visibility = new IntersectionObserver(([entry]) => {
			state.active = Boolean(entry?.isIntersecting) && !document.hidden;
			cancelAnimationFrame(state.frame);
			if (state.active) state.frame = requestAnimationFrame(draw);
		});
		visibility.observe(button);
		const pause = (): void => {
			state.active = !document.hidden;
			cancelAnimationFrame(state.frame);
			if (state.active) state.frame = requestAnimationFrame(draw);
		};
		document.addEventListener("visibilitychange", pause);
		return (): void => {
			state.active = false;
			cancelAnimationFrame(state.frame);
			observer.disconnect();
			visibility.disconnect();
			document.removeEventListener("visibilitychange", pause);
			renderer.dispose();
		};
	}, []);
	return (
		<canvas
			ref={ref}
			className="button-glass"
			tabIndex={-1}
			aria-hidden="true"
		/>
	);
};
