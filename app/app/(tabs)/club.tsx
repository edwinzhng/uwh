import type { ReactElement } from "react";
import { PrimaryWorkspace } from "../../src/backend/primary-workspace";
import { NativeTabContent } from "../../src/design-system";
import { ClubHomeScreen } from "../../src/features/club-home-screen";

const ClubRoute = (): ReactElement => (
	<PrimaryWorkspace screen="club">
		<NativeTabContent>
			<ClubHomeScreen />
		</NativeTabContent>
	</PrimaryWorkspace>
);
export default ClubRoute;
