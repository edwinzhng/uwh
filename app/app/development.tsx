import { Redirect } from "expo-router";
import type { ReactElement } from "react";

const DevelopmentRedirect = (): ReactElement => (
	<Redirect href="/members?tab=rankings" />
);
export default DevelopmentRedirect;
