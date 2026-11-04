import { expect, test } from "bun:test";
import {
	formatVenue,
	parseVenue,
	validateVenues,
	venueName,
} from "../src/domain/venue";

test("existing venues remain editable and name/address survive saving", (): void => {
	expect(parseVenue("Main pool", "first")).toEqual({
		id: "first",
		name: "Main pool",
		address: "",
	});
	const venue = {
		id: "second",
		name: " MNP Centre ",
		address: " 2225 Macleod Trail\nCalgary, AB ",
	};
	expect(parseVenue(formatVenue(venue), venue.id)).toEqual({
		...venue,
		name: "MNP Centre",
		address: "2225 Macleod Trail\nCalgary, AB",
	});
});
test("venues require names and reject duplicate locations while allowing different addresses", (): void => {
	const first = { id: "first", name: "Pool", address: "123 Main St" };
	expect(
		validateVenues([first, { ...first, id: "second", name: " pool " }]),
	).toBeDefined();
	expect(validateVenues([{ ...first, name: " " }])).toBeDefined();
	expect(
		validateVenues([first, { ...first, id: "second", address: "456 Main St" }]),
	).toBeUndefined();
	expect(validateVenues([])).toBeUndefined();
});

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
