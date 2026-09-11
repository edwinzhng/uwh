import { DesignTokens } from "@calgarycrocs/design-system/theme";
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";
import { Header } from "../components/header";
export const metadata: Metadata = {
	title: {
		default: "Calgary Crocs",
		template: "Calgary Crocs - %s",
	},
	icons: {
		icon: { url: "/club-logo.png", type: "image/png" },
		apple: "/club-logo.png",
	},
	description:
		"Take your hockey underwater. Try a session with the Calgary Crocs underwater hockey club.",
};
const Layout = ({ children }: { children: ReactNode }): ReactElement => (
	<html lang="en">
		<body>
			<DesignTokens />
			<Header />
			{children}
		</body>
	</html>
);
export default Layout;
