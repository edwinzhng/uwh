import { useGlobalSearchParams } from "expo-router";
import { Provider } from "jotai";
import type { ReactElement } from "react";
import { InboxProvider } from "../src/backend/inbox-provider";
import { MessagingProvider } from "../src/backend/messaging-provider";
import { BackendProvider } from "../src/backend/provider";
import {
	AppRouter,
	DesignProvider,
	LoadingPreview,
} from "../src/design-system";
import { AppNavigation } from "../src/features/app-navigation";
import { AvatarProvider } from "../src/features/avatar-provider";
import { ScreenErrorBoundary } from "../src/features/screen-error-boundary";

export const unstable_settings = {
	anchor: "(tabs)",
	screenErrorBoundary: ScreenErrorBoundary,
};

export { AppErrorBoundary as ErrorBoundary } from "../src/features/app-error-boundary";

const RootLayout = (): ReactElement => {
	const params = useGlobalSearchParams<{ loadingPreview?: string }>();
	return (
		<Provider>
			<DesignProvider>
				<LoadingPreview
					enabled={
						(__DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === "true") &&
						params.loadingPreview === "orb"
					}
				>
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
				</LoadingPreview>
			</DesignProvider>
		</Provider>
	);
};
export default RootLayout;
