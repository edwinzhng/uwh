import { useQuery } from "convex/react";
import { type ReactElement, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useApp } from "../demo/app-state";
import { screenWorkspace } from "./screen-workspace";

const LiveHomeWorkspace = ({
	children,
}: {
	children: ReactElement;
}): ReactElement => {
	const app = useApp();
	const workspace = useQuery(api.club.current, { screen: "home" });
	const { workspaceId, dispatch } = app;
	const accountId = app.account.id;
	const value = useMemo(
		() => screenWorkspace({ workspaceId, accountId, dispatch }, workspace),
		[workspace, workspaceId, accountId, dispatch],
	);
	return (
		<AppContext value={value ?? { ...app, loading: true }}>
			{children}
		</AppContext>
	);
};

export const HomeWorkspace = ({
	children,
}: {
	children: ReactElement;
}): ReactElement => {
	const app = useApp();
	return app.source === "convex" ? (
		<LiveHomeWorkspace key={`${app.workspaceId}:${app.account.id}`}>
			{children}
		</LiveHomeWorkspace>
	) : (
		children
	);
};
