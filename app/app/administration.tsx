import { Redirect, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";

const AdministrationRedirect = (): ReactElement => {
	const { section } = useLocalSearchParams<{ section?: string }>();
	return (
		<Redirect
			href={
				section === "registration"
					? "/registration"
					: section === "payments"
						? "/payments"
						: "/club"
			}
		/>
	);
};
export default AdministrationRedirect;
