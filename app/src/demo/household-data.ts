import { atom } from "jotai";

export type PreviewHouseholdLink = {
	id: string;
	userId: string;
	personId: string;
	origin: "created" | "administrator" | "previous";
	state: "available" | "accepted" | "dismissed" | "revoked";
	key: string;
	payload: string;
	createdBy: string;
};
export const previewHouseholdLinks = atom<PreviewHouseholdLink[]>([]);
export const previewHouseholdAccounts = atom<
	Record<string, { children: string[]; defaultPersonId?: string }>
>({});
