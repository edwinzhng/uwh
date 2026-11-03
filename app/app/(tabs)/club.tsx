import type { ReactElement } from "react";
import { NativeTabContent } from "../../src/design-system";
import { ClubHomeScreen } from "../../src/features/club-home-screen";

const ClubRoute = (): ReactElement => (
	<NativeTabContent>
		<ClubHomeScreen />
	</NativeTabContent>
);
export default ClubRoute;
