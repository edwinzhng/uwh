import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Grid, Stack } from "../design-system";
import { homeNextPractice, homePendingResponse } from "../domain/home-summary";
import { HomeAnnouncement } from "./home-announcement";
import { HomeFitness } from "./home-fitness";
import { HomeHighlights } from "./home-highlights";
import { HomeMessages } from "./home-messages";
import { HomePractice } from "./home-practice";

export const HomeSummary = ({ now }: { now: number }): ReactElement => {
	const { data, account } = useApp();
	const practice = homeNextPractice(data, account, now);
	const pending = homePendingResponse(data, account, now);
	return (
		<Stack gap="xl">
			<HomePractice event={practice} responseNeeded={Boolean(pending)} />
			<HomeAnnouncement />
			<HomeHighlights />
			<Grid gap="md">
				<HomeFitness />
				<HomeMessages />
			</Grid>
		</Stack>
	);
};
