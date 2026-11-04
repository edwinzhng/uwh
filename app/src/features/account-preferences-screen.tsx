import type { ReactElement } from "react";
import { AccountSettingsContent } from "./account-settings-screen";
import { ClubShell } from "./club-shell";

export const AccountPreferencesScreen = (): ReactElement => (
	<ClubShell title="Account settings">
		<AccountSettingsContent />
	</ClubShell>
);
