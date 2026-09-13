import type { ReactElement, ReactNode } from "react";
import { SectionReveal } from "./section-reveal";

type Content = { children?: ReactNode };
export const Main = ({
	children,
	variant = "default",
}: Content & {
	variant?: "default" | "coaches" | "not-found";
}): ReactElement => (
	<main
		className={
			variant === "coaches"
				? "page wrap coaches-page"
				: variant === "not-found"
					? "not-found-page"
					: undefined
		}
	>
		{children}
	</main>
);
export const Container = ({ children }: Content): ReactElement => (
	<div className="wrap">{children}</div>
);
export const Stack = ({ children }: Content): ReactElement => (
	<div>{children}</div>
);
export const Background = ({
	children,
	variant,
}: Content & { variant: "joining" | "practice" }): ReactElement => (
	<div
		className={
			variant === "joining" ? "joining-background" : "practice-background"
		}
	>
		{children}
	</div>
);
const sections = {
	content: "club-section wrap",
	overview: "club-section club-overview wrap",
	practice: "practice-section wrap",
	policies: "policies-section wrap",
	summer: "summer-schedule",
	editor: "admin-section",
	fields: "form admin-section",
};
export const Section = ({
	children,
	variant = "content",
	id,
	labelledBy,
}: Content & {
	variant?: keyof typeof sections;
	id?: string;
	labelledBy?: string;
}): ReactElement =>
	variant === "editor" || variant === "fields" ? (
		<section id={id} className={sections[variant]} aria-labelledby={labelledBy}>
			{children}
		</section>
	) : (
		<SectionReveal
			id={id}
			className={sections[variant]}
			labelledBy={labelledBy}
		>
			{children}
		</SectionReveal>
	);
export const Grid = ({
	children,
	variant,
}: Content & { variant: "coaches" | "practice" | "summer" }): ReactElement => (
	<div
		className={
			variant === "coaches"
				? "coaches-grid"
				: variant === "practice"
					? "practice-grid regular-season-grid"
					: "summer-sessions"
		}
	>
		{children}
	</div>
);
export const Actions = ({ children }: Content): ReactElement => (
	<div className="admin-actions">{children}</div>
);
