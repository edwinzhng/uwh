import { internalAction } from "./_generated/server";
import { decryptAppleToken, encryptAppleToken } from "./apple_token_crypto";

export const check = internalAction({
	args: {},
	handler: async (): Promise<boolean> => {
		const probe = "Apple authorization storage runtime check";
		const encrypted = await encryptAppleToken(probe);
		return (
			encrypted !== probe && (await decryptAppleToken(encrypted)) === probe
		);
	},
});
