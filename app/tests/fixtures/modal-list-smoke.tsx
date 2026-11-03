import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtualizedList } from "react-native";
import { ModalListBoundary } from "../../src/design-system/modal-list-boundary.web";

export const modalListSmoke = (): { inherited: string; isolated: string } => {
	const ListContext = VirtualizedList.contextType;
	if (!ListContext) throw new Error("Virtualized list context is unavailable");
	const read = (
		<ListContext.Consumer>
			{(value: object | null): ReactNode =>
				value === null ? "independent" : "nested"
			}
		</ListContext.Consumer>
	);
	return {
		inherited: renderToStaticMarkup(
			<ListContext.Provider value={{ cellKey: "messages" }}>
				{read}
			</ListContext.Provider>,
		),
		isolated: renderToStaticMarkup(
			<ListContext.Provider value={{ cellKey: "messages" }}>
				<ModalListBoundary>{read}</ModalListBoundary>
			</ListContext.Provider>,
		),
	};
};
