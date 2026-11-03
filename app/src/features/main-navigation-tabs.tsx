import type { ReactElement } from "react";
import { useMessaging } from "../backend/messaging-context";
import { MainTabs } from "../design-system";

export const MainNavigationTabs = (): ReactElement => {
	const unread = useMessaging().threads.filter(
		(thread) => thread.unread > 0,
	).length;
	return <MainTabs unread={unread} />;
};
