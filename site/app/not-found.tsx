import Link from "next/link";
import type { ReactElement } from "react";

const NotFound = (): ReactElement => (
	<main className="not-found-page">
		<div className="wrap">
			<p className="eyebrow">404</p>
			<h1>Page not found</h1>
			<p>This page may have moved or no longer exists.</p>
			<Link href="/" className="button">
				Back to home
			</Link>
		</div>
	</main>
);

export default NotFound;
