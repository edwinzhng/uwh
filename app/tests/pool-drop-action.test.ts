import { expect, test } from "bun:test";
import { poolBoardDropAction } from "../src/design-system/pool-board-layout";

const targets = [
	{
		slotId: "2",
		personId: "sam",
		bounds: { x: 0, y: 0, width: 44, height: 44 },
	},
	{ slotId: "2", bounds: { x: 48, y: 0, width: 44, height: 44 } },
];
test("only the player target swaps; the dotted plus adds without displacing them", (): void => {
	expect(poolBoardDropAction(targets, 22, 22, "alex", "2")).toEqual({
		kind: "swap",
		personId: "sam",
	});
	expect(poolBoardDropAction(targets, 70, 22, "alex", "2")).toEqual({
		kind: "add",
		slotId: "2",
	});
	expect(poolBoardDropAction(targets, 45, 22, "alex", "2")).toEqual({
		kind: "add",
		slotId: "2",
	});
	expect(poolBoardDropAction(targets, 22, 22, "sam", "2")).toBeUndefined();
});

test("player swaps take priority over their enclosing position target", (): void => {
	const position = {
		slotId: "2",
		bounds: { x: 0, y: 0, width: 200, height: 160 },
	};
	const player = targets.at(0);
	if (!player) throw new Error("Missing player target");
	expect(poolBoardDropAction([position, player], 22, 22, "alex", "2")).toEqual({
		kind: "swap",
		personId: "sam",
	});
	expect(
		poolBoardDropAction([position, player], 150, 100, "alex", "2"),
	).toEqual({
		kind: "add",
		slotId: "2",
	});
	expect(
		poolBoardDropAction([position, player], 22, 22, "sam", "2"),
	).toBeUndefined();
});
