import type { ReactElement } from "react";
import { RouteWorkspace } from "./route-workspace";

export const PrimaryWorkspace = ({
	screen,
	children,
}: {
	screen: "home" | "schedule" | "messages" | "club";
	children: ReactElement;
}): ReactElement => <RouteWorkspace name={screen}>{children}</RouteWorkspace>;
