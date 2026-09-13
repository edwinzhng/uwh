import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { SocialIcon } from "./social-icon";
export const SiteFooter = ({
	name,
	logo,
	email,
	social,
}: {
	name: string;
	logo: string;
	email: string;
	social: { name: "Facebook" | "Instagram"; url: string }[];
}): ReactElement => (
	<footer className="club-footer">
		<div className="wrap footer-grid">
			<Link href="/" className="footer-logo" aria-label={`${name} home`}>
				<Image src={logo} width={88} height={88} alt={name} />
			</Link>
			<div>
				<h3>Contact</h3>
				<a href={`mailto:${email}`}>{email}</a>
			</div>
			<div>
				<h3>Social media</h3>
				<div className="social-links">
					{social.map((link) => (
						<a
							key={link.name}
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={link.name}
						>
							<SocialIcon name={link.name} />
							<span className="visually-hidden">{link.name}</span>
						</a>
					))}
				</div>
			</div>
		</div>
	</footer>
);
