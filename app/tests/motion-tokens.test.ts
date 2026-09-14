import { expect, test } from "bun:test";
import { inspectMotionTokens } from "../../packages/design-system/check-motion";
import {
	motionDurations,
	motionEasings,
} from "../../packages/design-system/src/motion";

test("motion contract matches Rec's shared durations and easing curves", (): void => {
	expect(motionDurations).toEqual({
		instant: 0,
		fast: 150,
		standard: 200,
		slow: 300,
		extended: 500,
	});
	expect(motionEasings.out).toEqual([0.23, 1, 0.32, 1]);
});
test("motion checks reject custom durations and easing escape hatches", (): void => {
	for (const source of [
		"animationDuration: 420",
		"duration: 420",
		"duration: 0.3",
		"cubicBezier(0.22, 1, 0.36, 1)",
	])
		expect(inspectMotionTokens(source, "component.tsx").length).toBeGreaterThan(
			0,
		);
	for (const source of [
		"transition: opacity 420ms ease;",
		"transition: opacity var(--crocs-motion-slow) ease;",
		"transition: opacity var(--crocs-motion-custom);",
		"transition: opacity var(--crocs-motion-slow) cubic-bezier(0,1,0,1);",
	])
		expect(inspectMotionTokens(source, "styles.css").length).toBeGreaterThan(0);
	expect(
		inspectMotionTokens(
			"animationDuration: motion.duration.slow, animationTimingFunction: cubicBezier(...motion.easing.out)",
			"component.tsx",
		),
	).toEqual([]);
});
