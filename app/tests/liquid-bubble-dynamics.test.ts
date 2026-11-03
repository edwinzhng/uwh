import { expect, test } from "bun:test";
import {
	createLiquidBubbleDynamics,
	type LiquidBubbleFrame,
	liquidBubbleLimit,
} from "../src/design-system/liquid-bubble-dynamics";

const frames = new Map<string, LiquidBubbleFrame>([
	["player", { x: 20, y: 40, width: 64, height: 64 }],
]);
test("drag follows the pointer immediately and deformation preserves a bounded circular body", (): void => {
	const dynamics = createLiquidBubbleDynamics();
	dynamics.update(frames, undefined, 1 / 60, false);
	const frame = dynamics.update(
		frames,
		{ id: "player", x: 90, y: 30, velocityX: 20000, velocityY: 0 },
		1 / 60,
		false,
	);
	expect(frame.data.at(0)).toBe(142);
	expect(frame.data.at(1)).toBe(102);
	expect(frame.data.at(5)).toBeGreaterThan(1);
	expect(frame.data.at(5)).toBeLessThanOrEqual(1.22);
	expect(frame.count).toBe(1);
});
test("dropping at a new position settles and stops the frame loop", (): void => {
	const dynamics = createLiquidBubbleDynamics();
	dynamics.update(frames, undefined, 1 / 60, false);
	dynamics.update(
		frames,
		{ id: "player", x: 200, y: 80, velocityX: 1000, velocityY: 400 },
		1 / 60,
		false,
	);
	const destination = new Map([
		["player", { x: 100, y: 140, width: 64, height: 64 }],
	]);
	const samples = Array.from({ length: 120 }, () =>
		dynamics.update(destination, undefined, 1 / 60, false),
	);
	const final = samples.at(-1);
	expect(final?.moving).toBe(false);
	expect(final?.data.at(0)).toBeCloseTo(132, 2);
	expect(final?.data.at(1)).toBeCloseTo(172, 2);
	expect(final?.data.at(5)).toBeCloseTo(1, 3);
});
test("reduced motion keeps direct manipulation but suppresses stretch and settling", (): void => {
	const dynamics = createLiquidBubbleDynamics();
	const held = dynamics.update(
		frames,
		{ id: "player", x: 30, y: 40, velocityX: 10000, velocityY: 500 },
		1 / 60,
		true,
	);
	expect(held.data.at(0)).toBe(82);
	expect(held.data.at(5)).toBe(1);
	expect(held.data.at(7)).toBe(5);
	const released = dynamics.update(frames, undefined, 1 / 60, true);
	expect(released.moving).toBe(false);
	expect(released.data.at(0)).toBe(52);
});
test("the uniform buffer is reused and never exceeds the shader capacity", (): void => {
	const dynamics = createLiquidBubbleDynamics();
	const many = new Map(
		Array.from({ length: liquidBubbleLimit + 10 }, (_, index) => [
			String(index),
			{ x: index * 70, y: 0, width: 64, height: 64 },
		]),
	);
	const first = dynamics.update(many, undefined, 1 / 60, false);
	expect(first.count).toBe(liquidBubbleLimit);
	expect(first.data.length).toBe(liquidBubbleLimit * 8);
	const second = dynamics.update(new Map(), undefined, 1 / 60, false);
	expect(second.data).toBe(first.data);
	expect(second.count).toBe(0);
	expect(second.moving).toBe(false);
});

test("liquid return carries momentum through a damped overshoot", (): void => {
	const dynamics = createLiquidBubbleDynamics();
	dynamics.update(frames, undefined, 1 / 60, false);
	dynamics.update(
		frames,
		{ id: "player", x: 100, y: 0, velocityX: 1200, velocityY: 0 },
		1 / 60,
		false,
	);
	const positions = Array.from(
		{ length: 120 },
		() => dynamics.update(frames, undefined, 1 / 60, false).data.at(0) ?? 0,
	);
	expect(positions.every(Number.isFinite)).toBe(true);
	expect(Math.min(...positions)).toBeLessThan(52);
	expect(positions.at(-1)).toBeCloseTo(52, 2);
});
