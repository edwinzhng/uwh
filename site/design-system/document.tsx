import { DesignTokens } from "@calgarycrocs/design-system/theme";
import type { ReactElement, ReactNode } from "react";
import "./styles.css";
export const Document = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<html lang="en">
		<head>
			<link
				rel="preload"
				href="/fonts/degular-400.3ce9e3d135.woff2"
				as="font"
				type="font/woff2"
				crossOrigin="anonymous"
			/>
			<link
				rel="preload"
				href="/fonts/degular-600.a34658566b.woff2"
				as="font"
				type="font/woff2"
				crossOrigin="anonymous"
			/>
			<link
				rel="preload"
				href="/fonts/degular-display.6f0c8baa33.woff2"
				as="font"
				type="font/woff2"
				crossOrigin="anonymous"
			/>
		</head>
		<body>
			<DesignTokens />
			{children}
		</body>
	</html>
);
