import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { AuthLayout, Text } from "../design-system";
import { AccountSecurity } from "./account-security";
import { AuthForm } from "./auth-form";

export const DeleteAccountScreen = (): ReactElement => {
	const backend = useBackend();
	return (
		<AuthLayout title="Delete your account">
			{!backend.available ? (
				<Text>Account service unavailable.</Text>
			) : backend.accountInfo ? (
				<AccountSecurity />
			) : (
				<>
					<Text variant="small">
						Sign in to delete your UWH Club account and personal data.
					</Text>
					<AuthForm />
				</>
			)}
		</AuthLayout>
	);
};
