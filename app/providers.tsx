"use client";

import { Provider } from "jotai";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
	return (
		<ConvexClientProvider>
			<Provider>{children}</Provider>
		</ConvexClientProvider>
	);
};
