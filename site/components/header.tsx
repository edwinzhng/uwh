import type { ReactElement } from "react";
import { SiteHeader } from "../design-system";
import { JoinButton } from "./join-button";
import { PageNavigation } from "./page-navigation";
export const Header = (): ReactElement => (
	<SiteHeader
		name="Calgary Crocs"
		wordmark="/club-wordmark.svg"
		logo="/club-logo.png"
		navigation={<PageNavigation />}
		action={<JoinButton variant="navigation">Sign up</JoinButton>}
	/>
);
