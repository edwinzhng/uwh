export type SourcePerson = {
	source: "base44" | "legacy" | "sporteasy" | "registration";
	sourceId: string;
	name: string;
	sporteasyId?: string;
};

const approvedAliases: Readonly<Record<string, string>> = {
	"david randall": "dave randall",
	"erika rovira": "erika rov",
	"joseph wernikowski": "joe wernikowski",
};

export const migrationName = (name: string): string => {
	const normalized = name
		.normalize("NFKD")
		.replace(/\p{Diacritic}/gu, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	return approvedAliases[normalized] ?? normalized;
};

export type IdentityProposal = {
	person: SourcePerson;
	candidates: SourcePerson[];
	status: "new" | "match" | "review";
	method: "source-id" | "unique-name" | "none";
};

export const proposeMigrationIdentity = (
	person: SourcePerson,
	people: SourcePerson[],
	approvedDuplicates: readonly (readonly string[])[] = [],
): IdentityProposal => {
	const sourceMatches = person.sporteasyId
		? people.filter((candidate) => candidate.sporteasyId === person.sporteasyId)
		: [];
	const candidates = sourceMatches.length
		? sourceMatches
		: people.filter(
				(candidate) =>
					migrationName(candidate.name) === migrationName(person.name),
			);
	const identityKey = (candidate: SourcePerson): string => {
		const key = `${candidate.source}:${candidate.sourceId}`;
		return (
			approvedDuplicates.find((group) => group.includes(key))?.at(0) ?? key
		);
	};
	const sameSourceDuplicates = candidates.some(
		(candidate) =>
			new Set(
				candidates
					.filter((other) => other.source === candidate.source)
					.map(identityKey),
			).size > 1,
	);
	return {
		person,
		candidates,
		status: !candidates.length
			? "new"
			: sameSourceDuplicates
				? "review"
				: "match",
		method: sourceMatches.length
			? "source-id"
			: candidates.length
				? "unique-name"
				: "none",
	};
};
