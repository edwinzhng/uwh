import { geometry } from "./tokens";

export const sectionNavigationPresentation = (
	width: number,
): "tabs" | "compact-tabs" =>
	width >= geometry.wide ? "tabs" : "compact-tabs";
