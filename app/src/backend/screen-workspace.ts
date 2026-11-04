import type { AppContextValue } from "../demo/app-state";
import type { Account, AppData } from "../domain/app-types";

type WorkspaceSnapshot = {
	clubId: string;
	data: AppData;
	account: Account;
	accounts: Account[];
};

export const screenWorkspace = (
	scope: {
		workspaceId?: string;
		accountId: string;
		dispatch: AppContextValue["dispatch"];
	},
	workspace: WorkspaceSnapshot | null | undefined,
): AppContextValue | undefined =>
	workspace &&
	workspace.clubId === scope.workspaceId &&
	workspace.account.id === scope.accountId
		? {
				data: workspace.data,
				account: workspace.account,
				accounts: workspace.accounts,
				workspaceId: workspace.clubId,
				source: "convex",
				loading: false,
				dispatch: scope.dispatch,
			}
		: undefined;
