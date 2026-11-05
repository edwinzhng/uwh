import { expect, test } from "bun:test";
import { createContentRevealState } from "../src/design-system/content-reveal-state";

test("initial card reveals wait for page readiness, loading handoff and focus", (): void => {
	const reveal = createContentRevealState();
	const state = { eligible: true, ready: false, active: true, animate: true };
	expect(reveal.update(state)).toBe("wait");
	expect(reveal.update({ ...state, ready: true, active: false })).toBe("wait");
	expect(reveal.update({ ...state, ready: true })).toBe("play");
	expect(reveal.update({ ...state, ready: false })).toBe("show");
	expect(reveal.update({ ...state, ready: true })).toBe("show");
});

test("filter results, pagination and reduced motion show immediately without replaying the stagger", (): void => {
	expect(
		createContentRevealState().update({
			eligible: false,
			ready: true,
			active: true,
			animate: true,
		}),
	).toBe("show");
	const reveal = createContentRevealState();
	expect(
		reveal.update({
			eligible: true,
			ready: true,
			active: true,
			animate: false,
		}),
	).toBe("show");
	expect(
		reveal.update({ eligible: true, ready: true, active: true, animate: true }),
	).toBe("show");
});
