export type PlayerStrength = {
	personId: string;
	rating: number;
	ratingKnown?: boolean;
};
export const teamStrength = (
	people: readonly string[],
	profiles: readonly PlayerStrength[],
): { total: number; scored: number; count: number } => {
	const ratings = [...new Set(people)].flatMap((id) => {
		const profile = profiles.find((entry) => entry.personId === id);
		return profile && profile.ratingKnown !== false ? [profile.rating] : [];
	});
	return {
		total:
			Math.round(ratings.reduce((sum, rating) => sum + rating, 0) * 10) / 10,
		scored: ratings.length,
		count: new Set(people).size,
	};
};
