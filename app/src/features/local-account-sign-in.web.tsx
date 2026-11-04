import { useAuthActions } from "@convex-dev/auth/react";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { friendlyError } from "../backend/errors";
import { AuthLayout, Button, Text } from "../design-system";
import { localSignInMessage } from "../domain/local-account-tools";

const pickerOrigin = "http://127.0.0.1:4302";
export const LocalAccountSignIn = (): ReactElement => {
	const { request } = useGlobalSearchParams<{ request?: string }>();
	const auth = useAuthActions();
	const router = useRouter();
	const started = useRef(false);
	const [error, setError] = useState<string>();
	useEffect(() => {
		const opener = window.opener;
		if (!opener || !request) return;
		const receive = (event: MessageEvent<unknown>): void => {
			if (
				event.origin !== pickerOrigin ||
				event.source !== opener ||
				started.current
			)
				return;
			const message = localSignInMessage(event.data);
			if (!message || message.requestId !== request) return;
			started.current = true;
			void auth
				.signOut()
				.then(() =>
					auth.signIn("email-code", {
						email: message.email,
						code: message.code,
					}),
				)
				.then((result): void => {
					if (!result.signingIn)
						throw new Error("Local sign-in did not complete.");
					opener.postMessage(
						{
							type: "uwh-local-sign-in-complete",
							requestId: request,
							ok: true,
						},
						pickerOrigin,
					);
					router.replace("/");
				})
				.catch((failure: unknown): void => {
					setError(friendlyError(failure));
					opener.postMessage(
						{
							type: "uwh-local-sign-in-complete",
							requestId: request,
							ok: false,
						},
						pickerOrigin,
					);
				});
		};
		window.addEventListener("message", receive);
		opener.postMessage(
			{ type: "uwh-local-sign-in-ready", requestId: request },
			pickerOrigin,
		);
		return (): void => window.removeEventListener("message", receive);
	}, [request, auth, router]);
	return (
		<AuthLayout title="Local account switch">
			<Text tone={error ? "danger" : "secondary"}>
				{error ?? "Signing in to the isolated production-data copy…"}
			</Text>
			{error ? (
				<Button
					label="Open account picker"
					onPress={(): void => {
						window.location.href = pickerOrigin;
					}}
				/>
			) : undefined}
		</AuthLayout>
	);
};
