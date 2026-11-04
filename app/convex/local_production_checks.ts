import { localAccountSwitchAllowed } from "../src/domain/local-account-tools";
import { internalQuery } from "./_generated/server";

export const storedFiles = internalQuery({
	args: {},
	handler: async (
		ctx,
	): Promise<{ id: string; size: number; sha256: string; url?: string }[]> => {
		if (
			!localAccountSwitchAllowed({
				enabled: process.env.LOCAL_ACCOUNT_SWITCH_ENABLED,
				backendUrl: process.env.CONVEX_CLOUD_URL,
				outboundDisabled: process.env.OUTBOUND_DELIVERY_DISABLED,
				emailMode: process.env.AUTH_EMAIL_MODE,
			})
		)
			throw new Error("Local production-copy verification is disabled.");
		const files = await ctx.db.system.query("_storage").take(10001);
		if (files.length > 10000)
			throw new Error("Verify a bounded file snapshot.");
		return Promise.all(
			files.map(
				async (
					file,
				): Promise<{
					id: string;
					size: number;
					sha256: string;
					url?: string;
				}> => {
					const url = await ctx.storage.getUrl(file._id);
					return {
						id: file._id,
						size: file.size,
						sha256: file.sha256,
						...(url ? { url } : {}),
					};
				},
			),
		);
	},
});
