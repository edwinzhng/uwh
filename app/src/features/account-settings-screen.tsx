import { useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
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
import { NotificationSettings } from "./notification-settings";
import { useTask } from "./use-task";
export const AccountSettingsContent = (): ReactElement => {
	const { source } = useApp();
	const backend = useBackend();
	const router = useRouter();
	const task = useTask();
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
							isLoading={task.busy}
							onPress={(): void => {
								void task.run(async (): Promise<void> => {
									await backend.signOut?.();
								});
							}}
						/>
					</Row>
				</>
			) : undefined}
			<NotificationSettings />
			<Button
				label="Club terms"
				variant="ghost"
				onPress={(): void => router.navigate("/terms")}
			/>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
