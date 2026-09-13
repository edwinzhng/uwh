import { Button as SharedButton } from "@calgarycrocs/design-system/button";
import { Field as SharedField } from "@calgarycrocs/design-system/field";
import { SegmentedControl as SharedSegments } from "@calgarycrocs/design-system/segmented-control";
import Link from "next/link";
import type { ComponentProps, ReactElement, ReactNode } from "react";

type SafeProps<T> = Omit<
	T,
	"style" | "className" | "dangerouslySetInnerHTML" | "color"
>;
export const Button = ({
	variant = "primary",
	...props
}: SafeProps<ComponentProps<typeof SharedButton>> & {
	variant?: "primary" | "navigation";
}): ReactElement => (
	<SharedButton
		{...props}
		className={
			variant === "navigation" ? "nav-register" : "button button-green"
		}
	/>
);
export const Field = (
	props: SafeProps<ComponentProps<typeof SharedField>>,
): ReactElement => <SharedField {...props} />;
export const TextArea = (
	props: SafeProps<ComponentProps<"textarea">>,
): ReactElement => <textarea {...props} />;
export const Select = ({
	options,
	...props
}: SafeProps<Omit<ComponentProps<"select">, "children">> & {
	options: { value: string; label: string }[];
}): ReactElement => (
	<select {...props}>
		{options.map((option) => (
			<option key={option.value} value={option.value}>
				{option.label}
			</option>
		))}
	</select>
);
export const SegmentedControl = (
	props: SafeProps<ComponentProps<typeof SharedSegments>>,
): ReactElement => <SharedSegments {...props} className="group-segments" />;
export const Form = ({
	variant = "default",
	...props
}: SafeProps<ComponentProps<"form">> & {
	variant?: "default" | "admin" | "login";
}): ReactElement => (
	<form
		{...props}
		className={
			variant === "admin"
				? "form admin-form"
				: variant === "login"
					? "form login-form"
					: "form"
		}
	/>
);
export const FieldLabel = ({
	htmlFor,
	children,
}: SafeProps<ComponentProps<"label">>): ReactElement => (
	<label htmlFor={htmlFor}>{children}</label>
);
export const FieldGroup = ({
	children,
	label,
	variant = "default",
}: {
	children: ReactNode;
	label: ReactNode;
	variant?: "default" | "player";
}): ReactElement => (
	<fieldset
		className={variant === "player" ? "player-group" : "form admin-row"}
	>
		<legend>{label}</legend>
		{children}
	</fieldset>
);
export const Honeypot = ({ id }: { id: string }): ReactElement => (
	<label className="honeypot" aria-hidden="true" htmlFor={id}>
		Website
		<Field id={id} name="website" tabIndex={-1} autoComplete="off" />
	</label>
);
export const TextLink = ({
	href,
	children,
	external = false,
	button = false,
}: {
	href: string;
	children: ReactNode;
	external?: boolean;
	button?: boolean;
}): ReactElement => (
	<Link
		href={href}
		className={button ? "button" : undefined}
		target={external ? "_blank" : undefined}
		rel={external ? "noopener noreferrer" : undefined}
	>
		{children}
	</Link>
);
