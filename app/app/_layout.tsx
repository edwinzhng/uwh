import { Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { InboxProvider } from "../src/backend/inbox-provider";
import { MessagingProvider } from "../src/backend/messaging-provider";
import { BackendProvider } from "../src/backend/provider";
import { RouteWorkspace } from "../src/backend/route-workspace";
import { AppRouter, DesignProvider } from "../src/design-system";
import { AppNavigation } from "../src/features/app-navigation";
import { AvatarProvider } from "../src/features/avatar-provider";
import { ScreenErrorBoundary } from "../src/features/screen-error-boundary";

export const unstable_settings = {
	anchor: "(tabs)",
	screenErrorBoundary: ScreenErrorBoundary,
};

export { AppErrorBoundary as ErrorBoundary } from "../src/features/app-error-boundary";

const renderScreen = (
	name: string,
	params: Readonly<Record<string, unknown>> | undefined,
	children: ReactNode,
): ReactElement => (
	<RouteWorkspace name={name} params={params}>
		{children}
	</RouteWorkspace>
);

const RootLayout = (): ReactElement => {
	return (
		<Provider>
			<DesignProvider>
				<BackendProvider>
					<MessagingProvider>
						<InboxProvider>
							<AvatarProvider>
								<AppNavigation>
									<AppRouter renderScreen={renderScreen} />
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
