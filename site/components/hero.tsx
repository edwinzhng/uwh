import type { ReactElement } from "react";
import { HeroBanner } from "../design-system";
import { JoinButton } from "./join-button";
export const Hero = ({
	headline,
	intro,
}: {
	headline: string;
	intro: string;
}): ReactElement => (
	<HeroBanner
		name="Calgary Crocs"
		headline={headline}
		intro={intro}
		action={<JoinButton>Join today</JoinButton>}
	/>
);
