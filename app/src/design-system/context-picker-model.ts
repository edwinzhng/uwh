export const contextPickerPresentation = ({
	platform,
	width,
	breakpoint,
	requested,
}: {
	platform: string;
	width: number;
	breakpoint: number;
	requested: "automatic" | "sheet" | "menu";
}): "sheet" | "menu" =>
	requested === "sheet" ||
	(requested !== "menu" && platform === "web" && width < breakpoint)
		? "sheet"
		: "menu";
