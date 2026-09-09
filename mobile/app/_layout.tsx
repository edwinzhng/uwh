import { Stack } from "expo-router";
import { Provider } from "jotai";
import type { ReactElement } from "react";
import { MessagingProvider } from "../src/backend/messaging-provider";
import { BackendProvider } from "../src/backend/provider";
import { DesignProvider } from "../src/design-system";
import { AppNavigation } from "../src/features/app-navigation";

const RootLayout = (): ReactElement => (
	<Provider>
		<DesignProvider>
			<BackendProvider>
				<MessagingProvider>
					<AppNavigation>
						<Stack screenOptions={{ headerShown: false, animation: "none" }} />
					</AppNavigation>
				</MessagingProvider>
			</BackendProvider>
		</DesignProvider>
	</Provider>
);
export default RootLayout;
