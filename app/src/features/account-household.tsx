import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { HouseholdLive } from "./household-live";
import { HouseholdPreview } from "./household-preview";

export const AccountHousehold = (): ReactElement => {
	const { source } = useApp();
	return source === "convex" ? <HouseholdLive /> : <HouseholdPreview />;
};
