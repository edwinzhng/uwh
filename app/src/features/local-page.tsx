import { type ReactElement, useState } from "react";
import { Button, Row, Stack, Text } from "../design-system";
export const LocalPage = <T,>({
	items,
	children,
	size = 30,
}: {
	items: T[];
	children: (items: T[]) => ReactElement;
	size?: number;
}): ReactElement => {
	const [selected, setSelected] = useState(0);
	const page = Math.min(
		selected,
		Math.max(0, Math.ceil(items.length / size) - 1),
	);
	return (
		<Stack>
			{children(items.slice(page * size, (page + 1) * size))}
			{items.length > size ? (
				<Row justify="between">
					<Button
						label="Previous"
						variant="ghost"
						isDisabled={page === 0}
						onPress={() => setSelected(page - 1)}
					/>
					<Text variant="caption" tone="secondary">
						Page {page + 1}
					</Text>
					<Button
						label="Next"
						variant="ghost"
						isDisabled={(page + 1) * size >= items.length}
						onPress={() => setSelected(page + 1)}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
