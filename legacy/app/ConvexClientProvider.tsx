"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const rawConvexUrl =
	process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://localhost:3210";
const convexUrl = rawConvexUrl.split(/\s+/).at(0) ?? "http://localhost:3210";

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ConvexAuthNextjsProvider client={convex}>
			{children}
		</ConvexAuthNextjsProvider>
	);
}
