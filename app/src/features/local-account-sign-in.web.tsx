import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { friendlyError } from "../backend/errors";
import { AuthLayout, Button, Text } from "../design-system";
import {
	type LocalSignInHandoff,
	localSignInHandoff,
} from "../domain/local-account-tools";

const pickerOrigin = "http://127.0.0.1:4302";
const missingHandoff =
	"This page needs a fresh sign-in from the local account picker.";

const initialHandoff: LocalSignInHandoff | undefined =
	typeof window === "undefined"
		? undefined
		: localSignInHandoff(window.location.hash);

const forgetHandoff = (): void => {
	if (window.location.hash)
		window.history.replaceState(
			window.history.state,
			"",
			`${window.location.pathname}${window.location.search}`,
		);
};

export const LocalAccountSignIn = (): ReactElement => {
	const auth = useAuthActions();
	const router = useRouter();
	const [handoff] = useState(initialHandoff);
	const started = useRef(false);
	const [failure, setFailure] = useState<string>();
	const error = handoff ? failure : missingHandoff;
	useEffect((): void => {
		forgetHandoff();
		if (!handoff || started.current) return;
		started.current = true;
		void auth
			.signOut()
			.then(() =>
				auth.signIn("email-code", {
					email: handoff.email,
					code: handoff.code,
				}),
			)
			.then((result): void => {
				if (!result.signingIn)
					throw new Error("Local sign-in did not complete.");
				router.replace("/");
			})
			.catch((reason: unknown): void => setFailure(friendlyError(reason)));
	}, [handoff, auth, router]);
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
