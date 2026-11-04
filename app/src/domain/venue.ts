export const venueName = (venue: string): string => {
	const name = venue.split(/[\n,]/).at(0)?.trim() ?? "";
	return /^(MNP\b|2225\s+Macleod\s+Trail\b)/i.test(name) ? "MNP Centre" : name;
};

export type VenueEntry = { id: string; name: string; address: string };
export const parseVenue = (value: string, id: string): VenueEntry => {
	const [name = "", ...address] = value.split("\n");
	return { id, name, address: address.join("\n") };
};
export const formatVenue = (
	venue: Pick<VenueEntry, "name" | "address">,
): string =>
	[venue.name.trim(), venue.address.trim()].filter(Boolean).join("\n");
export const validateVenues = (
	venues: readonly VenueEntry[],
): string | undefined =>
	venues.some((venue) => !venue.name.trim())
		? "Enter a name for each venue"
		: new Set(venues.map((venue) => formatVenue(venue).toLocaleLowerCase()))
					.size !== venues.length
			? "Remove duplicate venues"
			: undefined;
