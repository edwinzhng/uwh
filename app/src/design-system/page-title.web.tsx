import type { ReactElement } from "react";

export const PageTitle = ({ title }: { title: string }): ReactElement => (
	<h1
		style={{
			position: "absolute",
			width: 1,
			height: 1,
			padding: 0,
			margin: -1,
			overflow: "hidden",
			clipPath: "inset(50%)",
			whiteSpace: "nowrap",
			border: 0,
		}}
	>
		{title}
	</h1>
);
