const accountAliases: Record<string, string> = {
	"jordan-fryers": "alex",
	"nathaniel-schoenberger": "casey",
	"ross-zariski": "morgan",
	"alexis-smith": "jamie",
	"brad-smith": "taylor",
};
const personAliases: Record<string, string> = {
	...accountAliases,
	"rylan-smith": "sam",
	"blake-smith": "mila",
	rylan: "sam",
	blake: "mila",
};
export const previewAccountId = (value?: string): string | undefined =>
	value ? (accountAliases[value] ?? value) : undefined;
export const previewPersonId = (value?: string): string | undefined =>
	value ? (personAliases[value] ?? value) : undefined;
