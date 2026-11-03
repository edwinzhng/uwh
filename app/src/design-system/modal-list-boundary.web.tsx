import type { ReactNode } from "react";
import { VirtualizedList } from "react-native";

const ListContext = VirtualizedList.contextType;

export const ModalListBoundary = ({
	children,
}: {
	children: ReactNode;
}): ReactNode =>
	ListContext ? (
		<ListContext.Provider value={null}>{children}</ListContext.Provider>
	) : (
		children
	);
