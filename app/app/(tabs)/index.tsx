import type { ReactElement } from "react";
import { NativeTabContent } from "../../src/design-system";
import { HomeScreen } from "../../src/features/home-screen";

const HomeRoute = (): ReactElement => (
	<NativeTabContent>
		<HomeScreen />
	</NativeTabContent>
);
export default HomeRoute;
