import type { ReactElement, ReactNode } from "react";
import { useApp } from "../demo/app-state";
import { PreviewMessagingProvider } from "../demo/preview-messaging-provider";
import { LiveMessagingProvider } from "./live-messaging-provider";

export const MessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveMessagingProvider>{children}</LiveMessagingProvider>
	) : (
		<PreviewMessagingProvider>{children}</PreviewMessagingProvider>
	);
