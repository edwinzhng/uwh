import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexHttpClient } from "convex/browser";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	type AccountConnectionPurpose,
	type SocialProvider,
	signInReturnPath,
} from "../domain/social-auth";
import {
	callbackAddress,
	currentAuthPath,
	openAuthBrowser,
} from "./auth-browser";
import {
	clearConnectionAttempt,
	readConnectionAttempt,
	saveConnectionAttempt,
} from "./connection-attempt";
import {
	clearSignInAttempt,
	readSignInAttempt,
	saveSignInAttempt,
} from "./sign-in-attempt";

export type SocialAuthService = {
	info?: FunctionReturnType<typeof api.connected_accounts.list>;
	signIn: (provider: SocialProvider) => Promise<void>;
	completeSignIn: (code: string) => Promise<string>;
	connect: (
		provider: SocialProvider,
		purpose?: AccountConnectionPurpose,
	) => Promise<void>;
	complete: (
		requestId: string,
		code: string,
	) => Promise<AccountConnectionPurpose>;
	disconnect: (accountId: Id<"authAccounts">) => Promise<void>;
};

export const useSocialAuth = (): SocialAuthService => {
	const client = useConvex();
	const auth = useAuthActions();
	const infoResult = useQuery(api.connected_accounts.list, {});
	const [, updateExpiration] = useState(0);
	const verificationExpiresAt = infoResult?.verificationExpiresAt ?? 0;
	useEffect((): (() => void) | undefined => {
		if (verificationExpiresAt <= Date.now()) return;
		const timer = setTimeout(
			(): void => updateExpiration(Date.now()),
			verificationExpiresAt - Date.now(),
		);
		return (): void => clearTimeout(timer);
	}, [verificationExpiresAt]);
	const info = infoResult
		? { ...infoResult, reauthenticated: verificationExpiresAt > Date.now() }
		: undefined;
	const begin = useMutation(api.connected_accounts.begin);
	const cancel = useMutation(api.connected_accounts.cancel);
	const finish = useAction(api.connection_actions.complete);
	const disconnect = useMutation(api.connected_accounts.disconnect);
	const router = useRouter();
	const path = usePathname();
	const params = useGlobalSearchParams<{
		invite?: string;
		revision?: string;
	}>();
	const completion = useRef<{
		requestId: string;
		result: Promise<AccountConnectionPurpose>;
	}>(undefined);
	const signInCompletion = useRef<{ code: string; result: Promise<string> }>(
		undefined,
	);
	const unauthenticatedClient = (): ConvexHttpClient => {
		const url = process.env.EXPO_PUBLIC_CONVEX_URL;
		if (!url) throw new Error("Account service unavailable.");
		return new ConvexHttpClient(url, { logger: false });
	};
	return {
		info,
		signIn: async (provider): Promise<void> => {
			if (!info?.[provider])
				throw new Error("This sign-in provider isn’t configured yet.");
			const fallback =
				path === "/join" && params.invite && params.revision
					? `/join?${new URLSearchParams({ invite: params.invite, revision: params.revision })}`
					: path;
			const returnTo = signInReturnPath(currentAuthPath(fallback));
			const redirectTo =
				Platform.OS === "web" ? returnTo : callbackAddress("auth-callback");
			if (Platform.OS !== "web") await saveSignInAttempt(provider, returnTo);
			const result = await auth.signIn(provider, { redirectTo });
			if (Platform.OS === "web" || !result.redirect) return;
			const callback = await openAuthBrowser(
				result.redirect.toString(),
				redirectTo,
			);
			if (!callback) {
				await clearSignInAttempt();
				return;
			}
			const code = new URL(callback).searchParams.get("code");
			if (!code) throw new Error("Sign-in wasn’t completed. Try again.");
			router.replace({ pathname: "/auth-callback", params: { code } });
		},
		completeSignIn: (code): Promise<string> => {
			if (signInCompletion.current?.code === code)
				return signInCompletion.current.result;
			const result = (async (): Promise<string> => {
				const attempt = await readSignInAttempt();
				await auth.signIn(attempt.provider, { code });
				await clearSignInAttempt();
				return attempt.path;
			})();
			signInCompletion.current = { code, result };
			return result;
		},
		connect: async (provider, purpose = "link"): Promise<void> => {
			const requestId = await begin({ provider, purpose });
			const redirectTo = new URL(callbackAddress("connect-account"));
			redirectTo.searchParams.set("request", requestId);
			try {
				const result = await unauthenticatedClient().action(api.auth.signIn, {
					provider,
					params: { redirectTo: redirectTo.toString() },
				});
				if (!result.redirect || !result.verifier)
					throw new Error("Couldn’t start sign-in. Try again.");
				await saveConnectionAttempt({
					requestId,
					provider,
					purpose,
					verifier: result.verifier,
					expiresAt: Date.now() + 10 * 60000,
				});
				const callback = await openAuthBrowser(
					result.redirect,
					redirectTo.toString(),
				);
				if (Platform.OS === "web") return;
				if (!callback) {
					await cancel({ requestId });
					await clearConnectionAttempt();
					return;
				}
				const code = new URL(callback).searchParams.get("code") ?? "";
				router.replace({
					pathname: "/connect-account",
					params: { request: requestId, code },
				});
			} catch (error) {
				await cancel({ requestId }).catch((): void => {});
				await clearConnectionAttempt();
				throw error;
			}
		},
		complete: (requestId, code): Promise<AccountConnectionPurpose> => {
			if (completion.current?.requestId === requestId)
				return completion.current.result;
			const result = (async (): Promise<AccountConnectionPurpose> => {
				const previous = await client.query(api.connected_accounts.result, {
					requestId,
				});
				if (!previous)
					throw new Error("Connection expired. Start again from Settings.");
				if (previous.complete) return previous.purpose;
				const attempt = await readConnectionAttempt(requestId);
				const proofClient = unauthenticatedClient();
				const result = await proofClient.action(api.auth.signIn, {
					params: { code },
					verifier: attempt.verifier,
				});
				if (!result.tokens)
					throw new Error(
						"Sign-in wasn’t completed. Start again from Settings.",
					);
				proofClient.setAuth(result.tokens.token);
				try {
					await finish({
						requestId: attempt.requestId,
						token: result.tokens.token,
					});
					return attempt.purpose;
				} finally {
					await proofClient.action(api.auth.signOut, {}).catch((): void => {});
					await clearConnectionAttempt();
				}
			})();
			completion.current = { requestId, result };
			return result;
		},
		disconnect: async (accountId): Promise<void> => {
			await disconnect({ accountId });
		},
	};
};
