import { useGlobalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { AuthLayout, Button, Text } from "../design-system";

export const AuthCallbackScreen = (): ReactElement => {
	const { code = "" } = useGlobalSearchParams<{ code?: string }>();
	const backend = useBackend();
	const router = useRouter();
	const started = useRef(false);
	const [error, setError] = useState<string>();
	const failure = error ?? backend.social?.signInError;
	const completing = Boolean(
		code ||
			backend.loading ||
			backend.social?.signingIn ||
			backend.authenticated,
	);
	useEffect((): void => {
		if (started.current || !code || !backend.social || backend.loading) return;
		started.current = true;
		void backend.social
			.completeSignIn(code)
			.then((path): void => router.replace(path))
			.catch((error): void => setError(friendlyError(error)));
	}, [code, backend.social, backend.loading, router]);
	return (
		<AuthLayout title="Signing in">
			<Text variant="small" tone={failure ? "danger" : "secondary"}>
				{failure ??
					(completing
						? "Completing sign-in…"
						: "Sign-in wasn’t completed. Please try again.")}
			</Text>
			{failure || !completing ? (
				<Button
					label="Back to sign in"
					onPress={(): void => router.replace("/")}
				/>
			) : undefined}
		</AuthLayout>
	);
};
