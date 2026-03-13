"use client";

import { Activity, Calendar, Settings, Star, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/practices", label: "Practices", icon: Calendar },
	{ href: "/players", label: "Players", icon: User },
	{ href: "/fitness", label: "Fitness", icon: Activity },
	{ href: "/coaches", label: "Coaches", icon: Star },
	{ href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="hidden md:flex flex-col w-[210px] min-h-screen bg-[#021e00] flex-shrink-0 border-r border-[#1a3a00]">
			{/* Brand */}
			<div className="px-5 pt-6 pb-8">
				<p className="text-[#8aab8a] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
					Calgary
				</p>
				<h1 className="text-[#eef4f1] text-2xl font-bold leading-tight tracking-tight">
					CROCS
				</h1>
				<p className="text-[#8aab8a] text-[10px] tracking-[0.12em] uppercase mt-1">
					Coaching Tool
				</p>
			</div>

			{/* Nav */}
			<nav className="flex-1 px-3 space-y-0.5">
				{navItems.map(({ href, label, icon: Icon }) => {
					const active =
						pathname === href ||
						(href !== "/practices" && pathname.startsWith(href)) ||
						(href === "/practices" && pathname.startsWith("/practices"));
					return (
						<Link
							key={href}
							href={href}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5  text-sm font-medium ",
								active
									? "bg-[#298a29] text-white"
									: "text-[#8aab8a] hover:text-[#eef4f1] hover:bg-white/5",
							)}
						>
							<Icon className="h-4 w-4 flex-shrink-0" />
							{label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

export function MobileNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-[#021e00] border-t border-[#0a3a00]">
			{navItems.map(({ href, label, icon: Icon }) => {
				const active = pathname === href || pathname.startsWith(href);
				return (
					<Link
						key={href}
						href={href}
						className={cn(
							"flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-semibold tracking-[0.1em] uppercase ",
							active ? "text-white bg-[#298a29]" : "text-[#8aab8a]",
						)}
					>
						<Icon className="h-5 w-5" />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
