import { Fragment, type ReactElement, type ReactNode } from "react";
import { PageReveal } from "./page-reveal";

export const TabContent = ({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}): ReactElement => {
	return (
		<PageReveal replayKey={value} replayOnFocus={false} animateOnMount>
			<Fragment key={value}>{children}</Fragment>
		</PageReveal>
	);
};
