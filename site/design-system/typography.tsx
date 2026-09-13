import type { ReactElement, ReactNode } from "react";

type CopyProps = { children?: ReactNode; id?: string };
export const Heading = ({
	level = 2,
	id,
	children,
}: CopyProps & { level?: 1 | 2 | 3 | 4 }): ReactElement => {
	const Tag =
		level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
	return <Tag id={id}>{children}</Tag>;
};
const textVariants = {
	body: "",
	eyebrow: "eyebrow",
	lead: "lede",
	description: "hero-description",
	note: "practice-note",
	season: "practice-season",
	time: "summer-time",
	intro: "policy-intro",
	error: "error",
};
export const Text = ({
	children,
	id,
	variant = "body",
	role,
}: CopyProps & {
	variant?: keyof typeof textVariants;
	role?: "alert";
}): ReactElement => (
	<p id={id} className={textVariants[variant]} role={role}>
		{children}
	</p>
);
export const Strong = ({ children }: CopyProps): ReactElement => (
	<strong>{children}</strong>
);
export const Inline = ({ children }: CopyProps): ReactElement => (
	<span>{children}</span>
);
export const Hint = ({ children }: CopyProps): ReactElement => (
	<small>{children}</small>
);
export const Accent = ({ children }: CopyProps): ReactElement => (
	<span className="overview-accent">{children}</span>
);
export const Status = ({
	children,
	notice = false,
}: CopyProps & { notice?: boolean }): ReactElement => (
	<output className={notice ? "notice" : undefined}>{children}</output>
);
