import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Grid, Stack } from "../design-system";
import { homeNextPractice } from "../domain/home-summary";
import { HomeActions } from "./home-actions";
import { HomeAnnouncement } from "./home-announcement";
import { HomeFitness } from "./home-fitness";
import { HomeHighlights } from "./home-highlights";
import { HomeMessages } from "./home-messages";
import { HomePractice } from "./home-practice";

export const HomeSummary = ({ now }: { now: number }): ReactElement => {
	const { data, account } = useApp();
	const practice = homeNextPractice(data, account, now);
	return (
		<Stack gap="md">
			<HomeActions now={now} />
			<HomeAnnouncement />
			<HomeHighlights />
			<Grid gap="md">
				<HomePractice event={practice} />
				<HomeFitness />
			</Grid>
			<HomeMessages />
		</Stack>
	);
};
