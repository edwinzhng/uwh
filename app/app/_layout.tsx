import { Provider } from "jotai";
import type { ReactElement } from "react";
import { InboxProvider } from "../src/backend/inbox-provider";
import { MessagingProvider } from "../src/backend/messaging-provider";
import { BackendProvider } from "../src/backend/provider";
import { AppRouter, DesignProvider } from "../src/design-system";
import { AppNavigation } from "../src/features/app-navigation";
import { AvatarProvider } from "../src/features/avatar-provider";
import { ScreenErrorBoundary } from "../src/features/screen-error-boundary";

export const unstable_settings = {
	anchor: "(tabs)",
	screenErrorBoundary: ScreenErrorBoundary,
};

export { AppErrorBoundary as ErrorBoundary } from "../src/features/app-error-boundary";

const RootLayout = (): ReactElement => {
	return (
		<Provider>
			<DesignProvider>
				<BackendProvider>
					<MessagingProvider>
						<InboxProvider>
							<AvatarProvider>
								<AppNavigation>
									<AppRouter />
								</AppNavigation>
							</AvatarProvider>
						</InboxProvider>
					</MessagingProvider>
				</BackendProvider>
			</DesignProvider>
		</Provider>
	);
};
export default RootLayout;
