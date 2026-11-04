import { Redirect, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../src/demo/app-state";
import { AuthLayout, LoadingScreen } from "../src/design-system";
import { AuthForm } from "../src/features/auth-form";

const ReviewAuth = (): ReactElement => {
	const { mode } = useLocalSearchParams<{ mode?: string }>();
	const { source } = useApp();
	if (source === "preview" && mode === "loading") return <LoadingScreen />;
	return source === "preview" ? (
		<AuthLayout
			title={
				mode === "signUp"
					? "Create account"
					: mode === "reset"
						? "Recover account"
						: "Sign in"
			}
		>
			<AuthForm key={mode} />
		</AuthLayout>
	) : (
		<Redirect href="/" />
	);
};
export default ReviewAuth;
