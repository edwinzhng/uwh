import type { ReactElement } from "react";
import { ClubShell } from "./club-shell";
import { ClubShoutouts } from "./club-shoutouts";
import { ShoutoutEditor } from "./shoutout-editor";
export const ShoutoutsScreen = (): ReactElement => (
	<ClubShell
		title="Your shoutouts"
		floatingAction={<ShoutoutEditor floating />}
	>
		<ClubShoutouts />
	</ClubShell>
);
