import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Calgary Crocs UWH",
	description: "Coaching tool for Calgary Crocs Underwater Hockey",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<Providers>
					<div className="flex min-h-screen">
						<Sidebar />
						<main className="flex-1 min-h-screen bg-[#eef4f1] pb-20 md:pb-0">
							{children}
						</main>
					</div>
					<MobileNav />
				</Providers>
			</body>
		</html>
	);
}
