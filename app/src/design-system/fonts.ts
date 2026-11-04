import type { FontSource } from "expo-font";
import display from "../../assets/fonts/barlow-condensed-bold.ttf";
import medium from "../../assets/fonts/inter-medium.ttf";
import regular from "../../assets/fonts/inter-regular.ttf";
import semibold from "../../assets/fonts/inter-semibold.ttf";

export const fontSources: Record<string, FontSource> = {
	UwhClubDisplay: display,
	UwhClubInter: regular,
	UwhClubInterMedium: medium,
	UwhClubInterSemibold: semibold,
};
