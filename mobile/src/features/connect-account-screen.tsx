import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { AuthLayout, Button, Stack, Text } from "../design-system";
import type { AccountConnectionPurpose } from "../domain/social-auth";

export const ConnectAccountScreen = (): ReactElement => {
	const { request = "", code = "" } = useLocalSearchParams<{
		request?: string;
		code?: string;
	}>();
	const backend = useBackend();
	const router = useRouter();
	const started = useRef(false);
	const [done, setDone] = useState<AccountConnectionPurpose>();
	const [error, setError] = useState<string>();
	useEffect((): void => {
		if (
			started.current ||
			!request ||
			!code ||
			!backend.accountInfo ||
			!backend.social
		)
			return;
		started.current = true;
		void backend.social
			.complete(request, code)
			.then(setDone)
			.catch((error): void => setError(friendlyError(error)));
	}, [request, code, backend.accountInfo, backend.social]);
	return (
		<AuthLayout
			title={
				done === "verify"
					? "Identity verified"
					: done
						? "Account connected"
						: "Connect account"
			}
		>
			<Stack>
				<Text variant="small" tone={error ? "danger" : "secondary"}>
					{error ??
						(done
							? "Your club profile stays the same."
							: !code || !request
								? "Sign-in was cancelled. Start again from Settings."
								: backend.loading
									? "Connecting…"
									: !backend.authenticated
										? "Sign in to your original account, then connect again from Settings."
										: "Connecting…")}
				</Text>
				{done ||
				error ||
				!code ||
				(!backend.loading && !backend.authenticated) ? (
					<Button
						label={
							done === "verify"
								? "Continue to account settings"
								: "Back to settings"
						}
						onPress={(): void =>
							router.replace(done === "verify" ? "/delete-account" : "/account")
						}
					/>
				) : undefined}
			</Stack>
		</AuthLayout>
	);
};
