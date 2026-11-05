import { type ReactElement, useMemo } from "react";
import { formattedText } from "./formatted-text-model";
import { Stack } from "./stack";
import { Text } from "./text";
import type { TypographyVariant } from "./tokens";

export const FormattedText = ({
	children,
	variant = "body",
}: {
	children: string;
	variant?: TypographyVariant;
}): ReactElement => {
	const lines = useMemo(() => formattedText(children), [children]);
	return (
		<Stack gap="xxs">
			{lines.map((line) => (
				<Text key={line.index} selectable variant={variant}>
					{line.prefix}
					{line.runs.map((run) => (
						<Text
							key={run.offset}
							variant={variant}
							weight={run.bold ? "semibold" : undefined}
							italic={run.italic}
						>
							{run.text}
						</Text>
					))}
				</Text>
			))}
		</Stack>
	);
};
