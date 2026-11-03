export const venueName = (venue: string): string => {
	const name = venue.split(/[\n,]/).at(0)?.trim() ?? "";
	return /^(MNP\b|2225\s+Macleod\s+Trail\b)/i.test(name) ? "MNP Centre" : name;
};
