import Script from "next/script";
import type { ReactElement } from "react";
export const Turnstile = ({ siteKey }: { siteKey: string }): ReactElement => (
	<>
		<Script
			src="https://challenges.cloudflare.com/turnstile/v0/api.js"
			strategy="afterInteractive"
		/>
		<div className="cf-turnstile" data-sitekey={siteKey} />
	</>
);
