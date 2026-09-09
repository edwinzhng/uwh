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
	Badge,
	Button,
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
import { BlockedAccounts } from "./blocked-accounts";
import { CalendarSettings } from "./calendar-settings";
import { ClubShell } from "./club-shell";
import { NotificationSettings } from "./notification-settings";
import { useTask } from "./use-task";
export const AccountScreen = (): ReactElement => {
	const { account, source, data } = useApp();
	const backend = useBackend();
	const task = useTask();
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	const [reduceMotion, setReduceMotion] = useAtom(reduceMotionAtom);
	const [previewAccount] = useAtom(previewAccountIdAtom);
	const selectAccount = useSetAtom(selectPreviewAccountAtom);
	return (
		<ClubShell title="Account">
			{" "}
			<Surface>
				<Stack>
					<Text variant="h4">
						{source === "convex" ? account.name : "App preview"}
					</Text>
					<Row wrap>
						{source === "convex" ? (
							<Badge label="Signed in" kind="success" />
						) : (
							<Badge label="Sample data" />
						)}
						{account.admin ? <Badge label="Admin" kind="admin" /> : undefined}
						{account.coachPrograms.length ? (
							<Badge label="Coach" kind="coach" />
						) : undefined}
						{account.children.length ? <Badge label="Parent" /> : undefined}
						{data.members.find((member) => member.id === account.personId)
							?.programs.length ? (
							<Badge label="Player" />
						) : undefined}
					</Row>
					{source === "preview" ? (
						<Select
							label="Preview account"
							value={previewAccount}
							options={previewAccounts.map((entry) => ({
								value: entry.id,
								label:
									entry.name +
									(entry.admin && entry.coachPrograms.length
										? " · All roles"
										: entry.admin
											? " · Admin"
											: entry.coachPrograms.length
												? " · Coach"
												: entry.children.length
													? " · Parent"
													: " · Player"),
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
				</Stack>
			</Surface>
			<Surface>
				<Stack>
					<Text variant="h4">Calendar</Text>
					<CalendarSettings />
				</Stack>
			</Surface>
			{source === "convex" ? (
				<>
					<NotificationSettings />
					<BlockedAccounts />
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
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</ClubShell>
	);
};
