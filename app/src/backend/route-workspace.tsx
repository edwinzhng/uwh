import { useIsFocused } from "expo-router";
import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useMemo, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, selectedPersonAtom, useApp } from "../demo/app-state";
import { screenWorkspace } from "./screen-workspace";
import { useRetainedQuery } from "./use-retained-query";
import { workspaceRequest } from "./workspace-request";

type Props = {
	name: string;
	params?: Readonly<Record<string, unknown>>;
	children: ReactNode;
};
const LiveRouteWorkspace = ({
	name,
	params,
	children,
}: Props): ReactElement => {
	const app = useApp();
	const selected = useAtomValue(selectedPersonAtom);
	const focused = useIsFocused();
	const request = workspaceRequest(name, params ?? {}, selected);
	const result = useRetainedQuery(api.club.current, focused ? request : "skip");
	const retained = useRef(result);
	if (result !== undefined) retained.current = result;
	const workspace = result === undefined ? retained.current : result;
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
export const RouteWorkspace = ({
	name,
	params,
	children,
}: Props): ReactNode => {
	const app = useApp();
	const selected = useAtomValue(selectedPersonAtom);
	const key = JSON.stringify([
		workspaceRequest(name, params ?? {}, selected),
		app.workspaceId,
		app.account.id,
		app.account.admin,
		app.account.coachPrograms,
		app.account.children,
	]);
	return app.source === "convex" && name !== "(tabs)" ? (
		<LiveRouteWorkspace key={key} name={name} params={params}>
			{children}
		</LiveRouteWorkspace>
	) : (
		children
	);
};
