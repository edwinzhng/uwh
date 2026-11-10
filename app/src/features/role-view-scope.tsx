import { useAtom } from "jotai";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useMemo,
} from "react";
import { AppContext, type AppContextValue } from "../demo/app-state";
import { visibleAppData } from "../domain/app-visibility";
import {
	canSwitchRoleView,
	type HomeView,
	playerAccount,
	roleView,
	roleViewAtom,
} from "./home-workspace-state";

export type RoleViewChoice = {
	value: HomeView;
	onValueChange: (value: HomeView) => void;
};

const RoleViewContext = createContext<RoleViewChoice | undefined>(undefined);

export const useRoleViewChoice = (): RoleViewChoice | undefined =>
	useContext(RoleViewContext);

const viewedApp = (app: AppContextValue, view: HomeView): AppContextValue => {
	if (view === "coaching") return app;
	const account = playerAccount(app.account);
	return { ...app, account, data: visibleAppData(app.data, account) };
};

const ScopedApp = ({
	app,
	children,
}: {
	app: AppContextValue;
	children: ReactNode;
}): ReactElement => {
	const [saved, setSaved] = useAtom(roleViewAtom);
	const accountId = app.account.id;
	const view = roleView(app.account, saved[accountId]);
	const value = useMemo(() => viewedApp(app, view), [app, view]);
	const choice = useMemo(
		(): RoleViewChoice | undefined =>
			canSwitchRoleView(app.account)
				? {
						value: view,
						onValueChange: (next): void =>
							setSaved((current) => ({ ...current, [accountId]: next })),
					}
				: undefined,
		[app.account, accountId, view, setSaved],
	);
	return (
		<RoleViewContext value={choice}>
			<AppContext value={value}>{children}</AppContext>
		</RoleViewContext>
	);
};

export const RoleViewScope = ({
	children,
}: {
	children: ReactNode;
}): ReactNode => {
	const app = useContext(AppContext);
	return app ? <ScopedApp app={app}>{children}</ScopedApp> : children;
};
