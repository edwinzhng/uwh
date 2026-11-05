import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../src/demo/app-state";
import { AuthLayout, LoadingScreen, Text } from "../src/design-system";
import { AuthForm } from "../src/features/auth-form";
import { StaffInviteForm } from "../src/features/staff-invite-form";

const ReviewAuth = (): ReactElement => {
	const { mode } = useLocalSearchParams<{ mode?: string }>();
	const { source } = useApp();
	const router = useRouter();
	if (source === "preview" && mode?.startsWith("staff-invite"))
		return (
			<AuthLayout title="Staff invite preview">
				<Text>Staff invite preview</Text>
				<StaffInviteForm
					canGrantAdmin
					create={async (): Promise<string> => {
						if (mode === "staff-invite-error")
							throw new Error("Example save failure. Try again.");
						return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
					}}
					onClose={(): void => router.replace("/")}
				/>
			</AuthLayout>
		);
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
