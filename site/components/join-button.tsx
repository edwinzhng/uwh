"use client";
import dynamic from "next/dynamic";
import type { ReactElement, ReactNode } from "react";
import { DialogTrigger, Text } from "../design-system";

const InterestForm = dynamic(
	() => import("./interest-form").then((module) => module.InterestForm),
	{ loading: () => <Text>Loading registration…</Text> },
);
export const JoinButton = ({
	children,
	variant,
}: {
	children: ReactNode;
	variant?: "primary" | "navigation";
}): ReactElement => (
	<DialogTrigger
		title="Registration"
		variant={variant}
		content={<InterestForm />}
	>
		{children}
	</DialogTrigger>
);
