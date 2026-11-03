import { useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { previewAccounts } from "../demo/app-data";
import {
	previewAccountIdAtom,
	selectPreviewAccountAtom,
	useApp,
} from "../demo/app-state";
import {
	Button,
	hapticsAvailable,
	hapticsEnabledAtom,
	Row,
	reduceMotionAtom,
	Select,
	Stack,
	Surface,
	Text,
	ThemeToggle,
	Toggle,
	themePreferenceAtom,
} from "../design-system";
import { AccountSecurity } from "./account-security";
import { SignOutConfirmation } from "./sign-out-confirmation";
export const AccountSettingsContent = (): ReactElement => {
	const { source } = useApp();
	const router = useRouter();
	const [signOutOpen, setSignOutOpen] = useState(false);
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	const [reduceMotion, setReduceMotion] = useAtom(reduceMotionAtom);
	const [haptics, setHaptics] = useAtom(hapticsEnabledAtom);
	const [previewAccount] = useAtom(previewAccountIdAtom);
	const selectAccount = useSetAtom(selectPreviewAccountAtom);
	return (
		<Stack>
			<Surface>
				<Stack>
					<Text variant="h4">Preferences</Text>
					{source === "preview" ? (
						<Select
							label="Account"
							value={previewAccount}
							options={previewAccounts.map((entry) => ({
								value: entry.id,
								label: entry.name,
								person: { id: entry.personId, name: entry.name },
							}))}
							onValueChange={(value): void => {
								if (value) selectAccount(value);
							}}
						/>
					) : undefined}
					<ThemeToggle value={theme} onValueChange={setTheme} />
					<Toggle
						label="Reduce motion"
						value={reduceMotion}
						onValueChange={setReduceMotion}
					/>
					{hapticsAvailable() ? (
						<Toggle
							label="Button haptics"
							value={haptics}
							onValueChange={setHaptics}
						/>
					) : undefined}
				</Stack>
			</Surface>
			{source === "convex" ? (
				<>
					<AccountSecurity />
					<Row>
						<Button
							label="Sign out"
							variant="secondary"
							onPress={(): void => setSignOutOpen(true)}
						/>
					</Row>
				</>
			) : undefined}
			{signOutOpen ? (
				<SignOutConfirmation onClose={(): void => setSignOutOpen(false)} />
			) : undefined}
			<Button
				label="Notification settings"
				variant="secondary"
				onPress={(): void =>
					router.push({
						pathname: "/account-settings",
						params: { section: "notifications" },
					})
				}
			/>
			<Button
				label="Linked profiles"
				variant="secondary"
				onPress={(): void =>
					router.push({
						pathname: "/account-settings",
						params: { section: "household" },
					})
				}
			/>
		</Stack>
	);
};
