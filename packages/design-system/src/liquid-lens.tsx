"use client";
import { type ReactElement, useEffect, useRef } from "react";
import { createLiquidRenderer, liquidDefaults } from "./liquid-renderer";
export const LiquidLens = ({
	imageSrc,
	areaSelector,
	className,
}: {
	imageSrc: string;
	areaSelector?: string;
	className?: string;
}): ReactElement => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = canvasRef.current;
		const area = areaSelector
			? canvas?.closest<HTMLElement>(areaSelector)
			: canvas?.parentElement;
		const motion = matchMedia(
			"(prefers-reduced-motion: reduce), (pointer: coarse)",
		);
		if (!canvas || !area || motion.matches) return;
		const renderer = createLiquidRenderer(canvas, "cursor", imageSrc);
		if (!renderer) return;
		const points = new Float32Array(24).fill(0.5);
		const state = {
			targetX: 0.5,
			targetY: 0.5,
			visibility: 0,
			inside: false,
			inViewport: true,
			frame: 0,
			previous: 0,
			width: 1,
			height: 1,
		};
		const resize = (): void => {
			const bounds = area.getBoundingClientRect();
			state.width = bounds.width;
			state.height = bounds.height;
			renderer.resize(bounds.width, bounds.height);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(area);
		resize();
		const animate = (now: number): void => {
			const delta = Math.min((now - state.previous) / 1000, 0.05);
			state.previous = now;
			state.visibility = Math.max(
				0,
				Math.min(
					1,
					state.visibility + (state.inside ? delta / 0.2 : -delta / 0.25),
				),
			);
			const alpha = 1 - (1 - liquidDefaults.mouseSmoothness) ** (delta * 60);
			points[0] =
				(points.at(0) ?? 0.5) + (state.targetX - (points.at(0) ?? 0.5)) * alpha;
			points[1] =
				(points.at(1) ?? 0.5) + (state.targetY - (points.at(1) ?? 0.5)) * alpha;
			const trailAlpha =
				1 - Math.exp((-delta * 11) / liquidDefaults.trailPersistence);
			for (const index of [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {
				for (const axis of [0, 1]) {
					const offset = index * 2 + axis;
					const current = points.at(offset) ?? 0.5;
					points[offset] =
						current +
						((points.at(offset - 2) ?? current) - current) * trailAlpha;
				}
			}
			renderer.render(now / 1000, state.visibility, points);
			state.frame =
				state.inside || state.visibility > 0
					? requestAnimationFrame(animate)
					: 0;
		};
		const start = (): void => {
			if (!state.frame) {
				state.previous = performance.now();
				state.frame = requestAnimationFrame(animate);
			}
		};
		const move = (event: PointerEvent): void => {
			if (motion.matches || document.hidden || !state.inViewport) return;
			const bounds = area.getBoundingClientRect();
			state.targetX = (event.clientX - bounds.left) / state.width;
			state.targetY = 1 - (event.clientY - bounds.top) / state.height;
			if (state.visibility === 0) {
				for (const index of Array.from({ length: 12 }, (_, index) => index)) {
					points[index * 2] = state.targetX;
					points[index * 2 + 1] = state.targetY;
				}
			}
			state.inside = true;
			start();
		};
		const leave = (): void => {
			state.inside = false;
			start();
		};
		const pause = (): void => {
			state.inside = false;
			state.visibility = 0;
			cancelAnimationFrame(state.frame);
			state.frame = 0;
			renderer.render(0, 0, points);
		};
		const intersection = new IntersectionObserver(([entry]): void => {
			state.inViewport = Boolean(entry?.isIntersecting);
			if (!state.inViewport) pause();
		});
		intersection.observe(area);
		window.addEventListener("scroll", pause, { passive: true, capture: true });
		area.addEventListener("pointermove", move);
		area.addEventListener("pointerleave", leave);
		window.addEventListener("blur", pause);
		document.addEventListener("visibilitychange", pause);
		motion.addEventListener("change", pause);
		return (): void => {
			pause();
			observer.disconnect();
			intersection.disconnect();
			window.removeEventListener("scroll", pause, true);
			area.removeEventListener("pointermove", move);
			area.removeEventListener("pointerleave", leave);
			window.removeEventListener("blur", pause);
			document.removeEventListener("visibilitychange", pause);
			motion.removeEventListener("change", pause);
			renderer.dispose();
		};
	}, [imageSrc, areaSelector]);
	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
			}}
			tabIndex={-1}
			aria-hidden="true"
		/>
	);
};
