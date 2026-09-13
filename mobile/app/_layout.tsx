import { Provider } from "jotai";
import type { ReactElement } from "react";
import { MessagingProvider } from "../src/backend/messaging-provider";
import { BackendProvider } from "../src/backend/provider";
import { AppRouter, DesignProvider } from "../src/design-system";
import { AppNavigation } from "../src/features/app-navigation";

const RootLayout = (): ReactElement => (
	<Provider>
		<DesignProvider>
			<BackendProvider>
				<MessagingProvider>
					<AppNavigation>
						<AppRouter />
					</AppNavigation>
				</MessagingProvider>
			</BackendProvider>
		</DesignProvider>
	</Provider>
);
export default RootLayout;
