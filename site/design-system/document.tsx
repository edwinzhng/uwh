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
				href="/degular-400.otf"
				as="font"
				type="font/otf"
				crossOrigin="anonymous"
			/>
			<link
				rel="preload"
				href="/degular-600.otf"
				as="font"
				type="font/otf"
				crossOrigin="anonymous"
			/>
			<link
				rel="preload"
				href="/degular-display.otf"
				as="font"
				type="font/otf"
				crossOrigin="anonymous"
			/>
		</head>
		<body>
			<DesignTokens />
			{children}
		</body>
	</html>
);
