import { atom } from "jotai";

export type CardMaterial = "watercolor";
export const cardMaterialAtom = atom<CardMaterial>("watercolor");
