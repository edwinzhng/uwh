import { Redirect, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";

const AccountRedirect = (): ReactElement => {
	const { tab } = useLocalSearchParams<{ tab?: string }>();
	return (
		<Redirect
			href={
				tab === "attendance"
					? "/account?tab=attendance"
					: "/account?tab=progress"
			}
		/>
	);
};
export default AccountRedirect;
