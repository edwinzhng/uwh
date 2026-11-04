import { createContext, useContext } from "react";
export type RoleTabTreatment = "glow" | "dot" | "underline" | "label";
export const RoleTabTreatmentContext = createContext<RoleTabTreatment>("dot");
export const useRoleTabTreatment = (): RoleTabTreatment =>
	useContext(RoleTabTreatmentContext);
