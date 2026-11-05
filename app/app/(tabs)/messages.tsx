import type { ReactElement } from "react";
import { PrimaryWorkspace } from "../../src/backend/primary-workspace";
import { NativeTabContent } from "../../src/design-system";
import { MessagesScreen } from "../../src/features/messages-screen";

const MessagesRoute = (): ReactElement => (
	<PrimaryWorkspace screen="messages">
		<NativeTabContent>
			<MessagesScreen />
		</NativeTabContent>
	</PrimaryWorkspace>
);
export default MessagesRoute;
