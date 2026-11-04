import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMember } from "./identity";

const sanitizedError = (value: string): string =>
	value
		.replace(/https?:\/\/\S+/g, "[url]")
		.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
		.replace(/eyJ[\w.-]+/g, "[token]")
		.slice(0, 1200);

export const report = mutation({
	args: { name: v.string(), message: v.string(), stack: v.string() },
	handler: async (ctx, error): Promise<void> => {
		await requireMember(ctx);
		console.error("Client screen error", {
			name: sanitizedError(error.name).slice(0, 80),
			message: sanitizedError(error.message),
			stack: sanitizedError(error.stack),
		});
	},
});
