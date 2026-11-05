export const lineupDisplayNames = (
	people: readonly { id: string; name: string }[],
): ReadonlyMap<string, string> => {
	const unique = [
		...new Map(people.map((person) => [person.id, person])).values(),
	];
	return new Map(
		unique.map((person) => {
			const words = person.name.trim().split(/\s+/);
			const first = words.at(0) ?? person.name;
			const matches = unique.filter(
				(candidate) =>
					(
						candidate.name.trim().split(/\s+/).at(0) ?? ""
					).toLocaleLowerCase() === first.toLocaleLowerCase(),
			);
			const last = words.slice(1).join(" ");
			const initial = last.at(0);
			const collision =
				initial &&
				matches.some(
					(candidate) =>
						candidate.id !== person.id &&
						candidate.name
							.trim()
							.split(/\s+/)
							.at(1)
							?.at(0)
							?.toLocaleLowerCase() === initial.toLocaleLowerCase(),
				);
			return [
				person.id,
				matches.length < 2 || !last
					? first
					: collision
						? `${first} ${last}`
						: `${first} ${initial}.`,
			];
		}),
	);
};
