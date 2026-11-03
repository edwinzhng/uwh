import { expect, test } from "bun:test";
import { venueName } from "../src/domain/venue";

test("home venue names omit street addresses and shorten MNP", (): void => {
	expect(
		venueName("MNP Community & Sport Centre, 2225 Macleod Trail SE, Calgary"),
	).toBe("MNP Centre");
	expect(venueName("2225 Macleod Trail SE, Calgary, AB T2G 5B6, Canada")).toBe(
		"MNP Centre",
	);
	expect(venueName("MNP Centre")).toBe("MNP Centre");
	expect(venueName("Other pool\n123 Main Street")).toBe("Other pool");
	expect(venueName("Riverside picnic area")).toBe("Riverside picnic area");
});
