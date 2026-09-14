import type { ReactElement, ReactNode } from "react";

export const WebDocument = ({
	children,
	reset,
}: {
	children: ReactNode;
	reset: ReactNode;
}): ReactElement => (
	<html lang="en">
		<head>
			<title>Crocs UWH</title>
			<meta charSet="utf-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1, viewport-fit=cover"
			/>
			<meta name="theme-color" content="#f5f7f6" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-title" content="UWH Club" />
			<link rel="manifest" href="/manifest.webmanifest" />
			<link rel="icon" type="image/png" sizes="256x256" href="/club-logo.png" />
			<link rel="apple-touch-icon" href="/club-logo.png" />
			{reset}
		</head>
		<body>{children}</body>
	</html>
);
