import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactElement, ReactNode } from "react";
import { WebDocument } from "../src/design-system";

const Root = ({ children }: { children: ReactNode }): ReactElement => (
	<WebDocument reset={<ScrollViewStyleReset />}>{children}</WebDocument>
);
export default Root;
