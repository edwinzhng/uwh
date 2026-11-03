import type { ReactElement } from "react";
import { NativeTabContent } from "../../src/design-system";
import { AgendaScreen } from "../../src/features/agenda-screen";

const ScheduleRoute = (): ReactElement => (
	<NativeTabContent>
		<AgendaScreen />
	</NativeTabContent>
);
export default ScheduleRoute;
