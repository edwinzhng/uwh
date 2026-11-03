import { expect, test } from "bun:test";
import {
	type PoolBoardDrag,
	poolBoardDropHighlighted,
	poolBoardSpotAt,
} from "../src/design-system/pool-board-layout";

test("pool drop targets follow measured rows as substitute stacks grow", (): void => {
	const rows = [["left", "right"], ["wing", "center", "other-wing"], ["back"]];
	const frames = new Map([
		[0, { y: 0, height: 180 }],
		[1, { y: 180, height: 240 }],
		[2, { y: 420, height: 120 }],
	]);
	expect(poolBoardSpotAt(rows, frames, 300, 210, 100)).toBe("right");
	expect(poolBoardSpotAt(rows, frames, 300, 150, 400)).toBe("center");
	expect(poolBoardSpotAt(rows, frames, 300, 150, 430)).toBe("back");
	for (const [width, x, y] of [
		[0, 0, 0],
		[300, -1, 0],
		[300, 300, 0],
		[300, 0, -1],
		[300, 0, 540],
	])
		expect(
			poolBoardSpotAt(rows, frames, width ?? 0, x ?? 0, y ?? 0),
		).toBeUndefined();
	expect(poolBoardSpotAt(rows, new Map(), 300, 40, 40)).toBeUndefined();
});

test("pool drag highlights only another spot in the same cohort within its measured bounds", (): void => {
	const frame = { x: 20, y: 40, width: 100, height: 140 };
	const drag: PoolBoardDrag = {
		personId: "player",
		scope: "adult",
		x: 70,
		y: 100,
	};
	expect(poolBoardDropHighlighted(drag, frame, "adult", "other")).toBe(true);
	expect(poolBoardDropHighlighted(drag, frame, "adult")).toBe(true);
	expect(poolBoardDropHighlighted(drag, frame, "adult", "player")).toBe(false);
	expect(poolBoardDropHighlighted(drag, frame, "youth", "other")).toBe(false);
	expect(poolBoardDropHighlighted(undefined, frame, "adult")).toBe(false);
	expect(poolBoardDropHighlighted(drag, undefined, "adult")).toBe(false);
	for (const point of [
		{ x: 19, y: 100 },
		{ x: 120, y: 100 },
		{ x: 70, y: 39 },
		{ x: 70, y: 180 },
		{ x: Number.NaN, y: 100 },
	])
		expect(
			poolBoardDropHighlighted({ ...drag, ...point }, frame, "adult"),
		).toBe(false);
	expect(poolBoardDropHighlighted(drag, { ...frame, width: 0 }, "adult")).toBe(
		false,
	);
});
