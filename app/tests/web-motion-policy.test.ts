import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { playPageReveal } from "../src/design-system/page-reveal-playback.web";
import { Progress } from "../src/design-system/progress.web";
import { motion } from "../src/design-system/tokens";

test("page fade uses the browser animation path and the unchanged shared contract", (): void => {
	const calls: {
		frames: Keyframe[] | PropertyIndexedKeyframes | null;
		options?: number | KeyframeAnimationOptions;
	}[] = [];
	const target = {
		animate: (
			frames: Keyframe[],
			options: KeyframeAnimationOptions,
		): Pick<Animation, "cancel"> => {
			calls.push({ frames, options });
			return { cancel: (): void => {} };
		},
	};
	playPageReveal(target, true);
	expect(calls).toEqual([
		{
			frames: [{ opacity: 0 }, { opacity: 1 }],
			options: {
				duration: motion.duration.slow,
				easing: `cubic-bezier(${motion.easing.out.join(",")})`,
			},
		},
	]);
});

test("keyboard and reduced motion skip browser animation entirely", (): void => {
	const target = {
		animate: (): never => {
			throw new Error("Animation must not start");
		},
	};
	expect(playPageReveal(target, false)).toBeUndefined();
});

test("progress has a fixed layout and scales only its blue gradient", (): void => {
	for (const [value, max, fraction] of [
		[3, 6, 0.5],
		[9, 6, 1],
		[-1, 6, 0],
		[3, 0, 0],
	]) {
		const markup = renderToStaticMarkup(
			createElement(Progress, {
				label: "Goal check-ins",
				value: value ?? 0,
				max: max ?? 0,
			}),
		);
		expect(markup).toContain(`scaleX(${fraction})`);
		expect(markup).toContain("transition-property:transform");
		expect(markup).toContain("transform-origin:left center");
		expect(markup).toContain('role="progressbar"');
		expect(markup).toContain('aria-label="Goal check-ins"');
		expect(markup).not.toContain("transition-property:width");
	}
});

test("shared route context is one Back action and explicit workflow Back takes precedence", async (): Promise<void> => {
	const source = await Bun.file("src/features/route-back.tsx").text();
	const shell = await Bun.file("src/features/club-shell.tsx").text();
	expect(source).toContain('prefix="arrowLeft"');
	expect(source).toMatch(/Back to .*route\.parentLabel.* from .*route\.label/);
	expect(source).not.toContain("Breadcrumbs");
	expect(shell).toContain("back ??");
	expect(shell).toContain("<RouteBack");
});

test("web page animations are cancelled on blur, interruption, and unmount without per-frame React updates", async (): Promise<void> => {
	const source = await Bun.file("src/design-system/page-reveal.web.tsx").text();
	expect(source).toContain("animation.current?.cancel()");
	expect(
		await Bun.file("src/design-system/use-page-reveal.ts").text(),
	).toContain("playback.current.stop()");
	expect(source).toContain("animate && pageMotionAllowed()");
	for (const forbidden of [
		"useSharedValue",
		"requestAnimationFrame",
		"useState",
		"withTiming",
	])
		expect(source).not.toContain(forbidden);
});
