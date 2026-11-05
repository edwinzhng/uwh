import { expect, test } from "bun:test";
import { poolBoardSpotAt } from "../src/design-system/pool-board-layout";
import { lineupDisplayNames } from "../src/domain/lineup-display-name";

test("lineup names disambiguate different people, not repeated assignments", (): void => {
	const names = lineupDisplayNames([
		{ id: "a", name: "Jordan Lee" },
		{ id: "a", name: "Jordan Lee" },
		{ id: "b", name: "Nathaniel Schoenberger" },
	]);
	expect(names.get("a")).toBe("Jordan");
	expect(names.get("b")).toBe("Nathaniel");
	const duplicate = lineupDisplayNames([
		{ id: "a", name: "Jordan Lee" },
		{ id: "b", name: "Jordan Fryers" },
	]);
	expect(duplicate.get("a")).toBe("Jordan L.");
	expect(duplicate.get("b")).toBe("Jordan F.");
	const sameInitial = lineupDisplayNames([
		{ id: "a", name: "Jordan Lee" },
		{ id: "b", name: "jordan Lane" },
	]);
	expect(sameInitial.get("a")).toBe("Jordan Lee");
	expect(sameInitial.get("b")).toBe("jordan Lane");
});
test("full-width pool groups accept drops at the outer forward edges", (): void => {
	const rows = [["LF", "RF"], ["LW", "C", "RW"], ["FB"]];
	const frames = new Map([[0, { y: 0, height: 100 }]]);
	expect(poolBoardSpotAt(rows, frames, 400, 1, 50, 0)).toBe("LF");
	expect(poolBoardSpotAt(rows, frames, 400, 399, 50, 0)).toBe("RF");
});
