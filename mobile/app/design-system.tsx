import { lazy, type ReactElement, Suspense } from "react";
import { Text } from "../src/design-system";

const Showcase = lazy(() =>
	import("../src/features/design-system-screen").then((module) => ({
		default: module.DesignSystemScreen,
	})),
);
const DesignSystemScreen = (): ReactElement => (
	<Suspense fallback={<Text>Loading components…</Text>}>
		<Showcase />
	</Suspense>
);
export default DesignSystemScreen;
