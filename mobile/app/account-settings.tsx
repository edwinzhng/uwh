import { Redirect } from "expo-router";
import type { ReactElement } from "react";

const AccountRedirect = (): ReactElement => {
	return <Redirect href="/account?tab=settings" />;
};
export default AccountRedirect;
