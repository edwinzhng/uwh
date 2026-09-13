import type { ReactElement } from "react";
import { SiteFooter } from "../design-system";
export const Footer = (): ReactElement => (
	<SiteFooter
		name="Calgary Crocs"
		logo="/club-logo.png"
		email="hello@calgaryuwh.com"
		social={[
			{ name: "Facebook", url: "https://www.facebook.com/CalgaryCrocsUWH/" },
			{
				name: "Instagram",
				url: "https://www.instagram.com/calgaryunderwaterhockey",
			},
		]}
	/>
);
