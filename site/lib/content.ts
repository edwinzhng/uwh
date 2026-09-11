export type SiteContent = {
	headline: string;
	intro: string;
	location: string;
	address: string;
	practiceNote: string;
	email: string;
	coaches: { name: string; role: string; bio: string }[];
	documents: { title: string; url: string; category: string }[];
};
export const initialContent: SiteContent = {
	headline: "Take your hockey underwater",
	intro:
		"Develop fitness, swimming, and teamwork in a fun, competitive environment. New players welcome, first two weeks free with equipment provided.",
	location: "MNP Community & Sport Centre",
	address: "2225 Macleod Trail SE, Calgary",
	practiceNote:
		"Youth and adult sessions. Get in touch and we’ll find the right first practice for you.",
	email: "hello@calgaryuwh.com",
	coaches: [],
	documents: [],
};
export const isContent = (value: unknown): value is SiteContent => {
	if (!value || typeof value !== "object") return false;
	return (
		"headline" in value &&
		typeof value.headline === "string" &&
		value.headline.length < 120 &&
		"intro" in value &&
		typeof value.intro === "string" &&
		"location" in value &&
		typeof value.location === "string" &&
		"address" in value &&
		typeof value.address === "string" &&
		"practiceNote" in value &&
		typeof value.practiceNote === "string" &&
		"email" in value &&
		typeof value.email === "string" &&
		"coaches" in value &&
		Array.isArray(value.coaches) &&
		value.coaches.every(
			(c: { name?: unknown; role?: unknown; bio?: unknown }) =>
				c !== null &&
				typeof c === "object" &&
				typeof c.name === "string" &&
				typeof c.role === "string" &&
				typeof c.bio === "string",
		) &&
		"documents" in value &&
		Array.isArray(value.documents) &&
		value.documents.every(
			(d: { title?: unknown; url?: unknown; category?: unknown }) =>
				d !== null &&
				typeof d === "object" &&
				typeof d.title === "string" &&
				typeof d.category === "string" &&
				typeof d.url === "string" &&
				/^https:\/\//.test(d.url),
		)
	);
};
