import type { ReactElement } from "react";
import { NativeTabContent } from "../../src/design-system";
import { MessagesScreen } from "../../src/features/messages-screen";

const MessagesRoute = (): ReactElement => (
	<NativeTabContent>
		<MessagesScreen />
	</NativeTabContent>
);
export default MessagesRoute;
