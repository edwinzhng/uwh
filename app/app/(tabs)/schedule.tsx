import type { ReactElement } from "react";
import { PrimaryWorkspace } from "../../src/backend/primary-workspace";
import { NativeTabContent } from "../../src/design-system";
import { AgendaScreen } from "../../src/features/agenda-screen";

const ScheduleRoute = (): ReactElement => (
	<PrimaryWorkspace screen="schedule">
		<NativeTabContent>
			<AgendaScreen />
		</NativeTabContent>
	</PrimaryWorkspace>
);
export default ScheduleRoute;
