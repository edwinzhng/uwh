import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { Header } from "../components/header";
import { JoinDialog } from "../components/join-dialog";
import { Document, PageTransition } from "../design-system";
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
	<Document>
		<PageTransition header={<Header />}>{children}</PageTransition>
		<JoinDialog />
		<Analytics />
	</Document>
);
export default Layout;
