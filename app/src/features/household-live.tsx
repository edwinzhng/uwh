import type { ReactElement } from "react";
import { useLiveHousehold } from "../backend/use-household";
import { HouseholdProfiles } from "./household-profiles";

export const HouseholdLive = (): ReactElement => (
	<HouseholdProfiles service={useLiveHousehold()} />
);
