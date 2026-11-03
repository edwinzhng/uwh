export const materialVariation = (seed: string): number =>
	(Array.from(seed).reduce(
		(value, character) =>
			(Math.imul(value, 31) + character.charCodeAt(0)) >>> 0,
		2166136261,
	) %
		997) /
	997;
