"use client";
import { type ReactElement, useEffect, useRef } from "react";
import { createLiquidRenderer, liquidDefaults } from "./liquid-renderer";
import { motionDurationSeconds, motionEffects } from "./motion";
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
		const motion = matchMedia("(prefers-reduced-motion: reduce)");
		if (!canvas || !area || motion.matches) return;
		const renderer = createLiquidRenderer(canvas, "cursor", imageSrc);
		if (!renderer) return;
		const points = new Float32Array(24).fill(0.5);
		const state = {
			targetX: 0.5,
			targetY: 0.5,
			visibility: 0,
			inside: false,
			touching: false,
			clientX: 0,
			clientY: 0,
			releaseAt: 0,
			releaseVisibility: 0,
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
			state.visibility = state.inside
				? Math.min(
						1,
						state.visibility + delta / motionDurationSeconds("standard"),
					)
				: state.releaseVisibility *
					Math.max(
						0,
						1 - (now - state.releaseAt) / motionEffects.liquidRelease,
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
		const move = (event: { clientX: number; clientY: number }): void => {
			if (motion.matches || document.hidden || !state.inViewport) return;
			const bounds = area.getBoundingClientRect();
			state.clientX = event.clientX;
			state.clientY = event.clientY;
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
			if (!state.inside) return;
			state.releaseAt = performance.now();
			state.releaseVisibility = state.visibility;
			state.inside = false;
			start();
		};
		const pause = (): void => {
			state.touching = false;
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
		const touchStart = (event: TouchEvent): void => {
			if (
				event.target instanceof Element &&
				event.target.closest("a, button, input, select, textarea")
			)
				return;
			const touch = event.touches.item(0);
			if (!touch) return;
			state.touching = true;
			move(touch);
		};
		const touchMove = (event: TouchEvent): void => {
			const touch = event.touches.item(0);
			if (state.touching && touch) move(touch);
		};
		const touchEnd = (): void => {
			state.touching = false;
			leave();
		};
		const scroll = (): void => {
			if (state.touching)
				move({ clientX: state.clientX, clientY: state.clientY });
			else leave();
		};
		const pointerMove = (event: PointerEvent): void => {
			if (event.pointerType !== "touch") move(event);
		};
		const pointerLeave = (): void => {
			if (!state.touching) leave();
		};
		window.addEventListener("scroll", scroll, { passive: true, capture: true });
		area.addEventListener("touchstart", touchStart, { passive: true });
		area.addEventListener("touchmove", touchMove, { passive: true });
		area.addEventListener("touchend", touchEnd, { passive: true });
		area.addEventListener("touchcancel", touchEnd, { passive: true });
		area.addEventListener("pointermove", pointerMove);
		area.addEventListener("pointerleave", pointerLeave);
		window.addEventListener("blur", pause);
		document.addEventListener("visibilitychange", pause);
		motion.addEventListener("change", pause);
		return (): void => {
			pause();
			observer.disconnect();
			intersection.disconnect();
			window.removeEventListener("scroll", scroll, true);
			area.removeEventListener("touchstart", touchStart);
			area.removeEventListener("touchmove", touchMove);
			area.removeEventListener("touchend", touchEnd);
			area.removeEventListener("touchcancel", touchEnd);
			area.removeEventListener("pointermove", pointerMove);
			area.removeEventListener("pointerleave", pointerLeave);
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
