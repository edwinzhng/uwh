import Image from "next/image";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
export const SiteHeader = ({
	name,
	wordmark,
	logo,
	navigation,
	action,
}: {
	name: string;
	wordmark: string;
	logo: string;
	navigation: ReactNode;
	action: ReactNode;
}): ReactElement => (
	<header className="header">
		<div className="nav-inner">
			<Link
				className="brand brand-wordmark"
				href="/"
				aria-label={`${name} home`}
			>
				<Image
					className="desktop-wordmark"
					src={wordmark}
					width={128}
					height={40}
					alt={name}
					priority
				/>
				<Image
					className="mobile-brand"
					src={logo}
					width={30}
					height={30}
					alt=""
				/>
			</Link>
			{navigation}
			{action}
		</div>
	</header>
);
