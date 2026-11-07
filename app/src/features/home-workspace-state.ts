import { atom } from "jotai";

export type HomeView = "personal" | "coaching";

export const homeWorkspaceAtom = atom<Record<string, HomeView>>({});

export const homeView = (
	canCoach: boolean,
	routeView: string | undefined,
	savedView: HomeView | undefined,
): HomeView =>
	canCoach &&
	(routeView === "coaching" ||
		(routeView !== "personal" && savedView === "coaching"))
		? "coaching"
		: "personal";
