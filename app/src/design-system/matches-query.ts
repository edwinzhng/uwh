const normalize = (value: string): string =>
	value
		.trim()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

export const matchesQuery = (label: string, query: string): boolean =>
	normalize(label).includes(normalize(query));
