import { createContext } from "react";

export const homeCardTreatments = [
	{ value: "current", label: "Current" },
	{ value: "spotlight", label: "A · Yellow spotlight" },
	{ value: "wash", label: "B · Color washes" },
	{ value: "accent", label: "C · Quiet accents" },
] as const;

export type HomeCardTreatment = (typeof homeCardTreatments)[number]["value"];

export const homeCardTreatment = (value?: string): HomeCardTreatment =>
	homeCardTreatments.find((option) => option.value === value)?.value ??
	"current";

export const HomeCardTreatmentContext = createContext<
	HomeCardTreatment | undefined
>(undefined);
