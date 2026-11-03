import type { ReactElement, ReactNode } from "react";
import { darkTheme, lightTheme } from "./tokens";

export const WebDocument = ({
	children,
	reset,
}: {
	children: ReactNode;
	reset: ReactNode;
}): ReactElement => (
	<html lang="en">
		<head>
			<title>UWH Club</title>
			<meta charSet="utf-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
			/>
			<meta
				name="theme-color"
				media="(prefers-color-scheme: light)"
				content={lightTheme.background.canvas}
			/>
			<meta
				name="theme-color"
				media="(prefers-color-scheme: dark)"
				content={darkTheme.background.canvas}
			/>
			<meta name="color-scheme" content="light dark" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-title" content="UWH Club" />
			<link rel="manifest" href="/manifest.webmanifest" />
			<link
				rel="icon"
				type="image/png"
				sizes="32x32"
				href="/crocs-app-v1-favicon.png"
			/>
			<link
				rel="apple-touch-icon"
				sizes="180x180"
				href="/crocs-app-v1-apple.png"
			/>
			{reset}
		</head>
		<body>{children}</body>
	</html>
);
