import { type ReactElement, useMemo } from "react";
import { formattedText } from "./formatted-text-model";
import { Stack } from "./stack";
import { Text } from "./text";

export const FormattedText = ({
	children,
}: {
	children: string;
}): ReactElement => {
	const lines = useMemo(() => formattedText(children), [children]);
	return (
		<Stack gap="xxs">
			{lines.map((line) => (
				<Text key={line.index} selectable>
					{line.prefix}
					{line.runs.map((run) => (
						<Text
							key={run.offset}
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
