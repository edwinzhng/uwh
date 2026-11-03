import { type ReactElement, useState } from "react";
import { InfiniteScroll, Stack } from "../design-system";
export const LocalPage = <T,>({
	items,
	children,
	size = 30,
}: {
	items: T[];
	children: (items: T[]) => ReactElement;
	size?: number;
}): ReactElement => {
	const [count, setCount] = useState(size);
	return (
		<Stack>
			{children(items.slice(0, count))}
			<InfiniteScroll
				loadMore={
					count < items.length
						? (): void => setCount((current) => current + size)
						: undefined
				}
				revision={count}
			/>
		</Stack>
	);
};
