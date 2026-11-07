import type { FontSource } from "expo-font";
import display from "../../assets/fonts/barlow-condensed-bold.ttf";
import medium from "../../assets/fonts/barlow-medium.ttf";
import regular from "../../assets/fonts/barlow-regular.ttf";
import semibold from "../../assets/fonts/barlow-semibold.ttf";

export const fontSources: Record<string, FontSource> = {
	UwhClubDisplay: display,
	UwhClubBarlow: regular,
	UwhClubBarlowMedium: medium,
	UwhClubBarlowSemibold: semibold,
};
