import type { ReactElement } from "react";
import { AuthLayout, Text } from "../design-system";
export const LocalAccountSignIn = (): ReactElement => (
	<AuthLayout title="Local sign-in">
		<Text>Open the local account picker in your browser.</Text>
	</AuthLayout>
);
