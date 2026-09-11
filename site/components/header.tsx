"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { JoinButton } from "./join-button";
import { PageNavigation } from "./page-navigation";
export const Header = (): ReactElement => {
	const overlay = usePathname() === "/";
	return (
		<header className={`header ${overlay ? "header-overlay" : ""}`}>
			<div className="nav-inner">
				<Link
					className="brand brand-wordmark"
					href="/"
					aria-label="Calgary Crocs home"
				>
					<Image
						className="desktop-wordmark"
						src="/club-wordmark.svg"
						width={128}
						height={40}
						alt="Calgary Crocs"
						priority
					/>
					<Image
						className="mobile-brand"
						src="/club-logo.png"
						width={30}
						height={30}
						alt=""
					/>
				</Link>
				<PageNavigation />
				<JoinButton className="nav-register">Sign up</JoinButton>
			</div>
		</header>
	);
};
