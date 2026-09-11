import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";
import { Header } from "../components/header";
export const metadata: Metadata = {
	title: {
		default: "Calgary Crocs · Underwater hockey",
		template: "%s · Calgary Crocs",
	},
	description:
		"Take your hockey underwater. Try a session with the Calgary Crocs underwater hockey club.",
};
const Layout = ({ children }: { children: ReactNode }): ReactElement => (
	<html lang="en">
		<body>
			<Header />
			{children}
		</body>
	</html>
);
export default Layout;
