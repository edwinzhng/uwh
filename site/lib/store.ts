import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { initialContent, isContent, type SiteContent } from "./content";
export const backend = (): ConvexHttpClient => {
	const url = process.env.CONVEX_URL;
	if (!url) throw new Error("Website backend is not configured");
	return new ConvexHttpClient(url);
};
export const serverKey = (): string => {
	const key = process.env.WEBSITE_SERVER_KEY;
	if (!key) throw new Error("Server key missing");
	return key;
};
export const getContent = async (): Promise<SiteContent> => {
	if (!process.env.CONVEX_URL) return initialContent;
	const json = await backend().query(
		makeFunctionReference<"query", Record<string, never>, string | undefined>(
			"website:content",
		),
		{},
	);
	if (!json) return initialContent;
	const value: unknown = JSON.parse(json);
	return isContent(value) ? value : initialContent;
};
