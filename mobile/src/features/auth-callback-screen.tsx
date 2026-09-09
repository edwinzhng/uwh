import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { AuthLayout, Button, Text } from "../design-system";

export const AuthCallbackScreen = (): ReactElement => {
	const { code = "" } = useLocalSearchParams<{ code?: string }>();
	const backend = useBackend();
	const router = useRouter();
	const started = useRef(false);
	const [error, setError] = useState<string>();
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
			<Text variant="small" tone={error ? "danger" : "secondary"}>
				{error ?? (code ? "Completing sign-in…" : "Sign-in was cancelled.")}
			</Text>
			{error || !code ? (
				<Button
					label="Back to sign in"
					onPress={(): void => router.replace("/")}
				/>
			) : undefined}
		</AuthLayout>
	);
};
