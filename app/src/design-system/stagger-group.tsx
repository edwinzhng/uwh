import {
	Children,
	createContext,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { Stack } from "./stack";
import { StaggerReveal } from "./stagger-reveal";
import type { SpaceToken } from "./tokens";

const StaggerGroupContext = createContext(false);

export const StaggerGroup = ({
	children,
	gap = "md",
}: {
	children: ReactNode;
	gap?: SpaceToken;
}): ReactElement => {
	const nested = useContext(StaggerGroupContext);
	const items = Children.toArray(children);
	const [initialKeys] = useState(
		() => new Set(items.filter(isValidElement).map((item) => item.key)),
	);
	return (
		<StaggerGroupContext.Provider value={true}>
			<Stack gap={gap}>
				{items.map((item, index) =>
					isValidElement(item) ? (
						<StaggerReveal
							key={item.key}
							index={index}
							enabled={!nested && initialKeys.has(item.key)}
						>
							{item}
						</StaggerReveal>
					) : (
						item
					),
				)}
			</Stack>
		</StaggerGroupContext.Provider>
	);
};
