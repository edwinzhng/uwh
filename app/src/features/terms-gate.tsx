import { useRouter } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { useBackend } from "../backend/context";
import { useLiveTerms } from "../backend/use-terms";
import {
	AuthLayout,
	Button,
	LoadingContent,
	Stack,
	Text,
} from "../design-system";
import { ConfirmButton } from "./confirm-button";
import { TermsAcceptance } from "./terms-acceptance";
import { useFormTask } from "./use-form-task";

export const TermsGate = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const service = useLiveTerms();
	const backend = useBackend();
	const router = useRouter();
	const task = useFormTask();
	if (!service.state) return <LoadingContent />;
	if (service.state.accepted) return <>{children}</>;
	return (
		<AuthLayout title="Review club terms">
			<Stack>
				{service.state.policy ? (
					<TermsAcceptance
						key={service.state.policy.id}
						policy={service.state.policy}
						accept={service.accept}
					/>
				) : (
					<Text tone="danger">
						The required policy is unavailable. Contact a club administrator.
					</Text>
				)}
				{service.state.canManage && service.state.required ? (
					<ConfirmButton
						label="Stop requiring this version"
						variant="ghost"
						title="Stop requiring these terms?"
						description="Members will no longer be required to accept this version before using the club app. Published text and existing acceptance records stay unchanged."
						confirmLabel="Stop requiring"
						isDisabled={task.busy}
						onConfirm={(): Promise<boolean> =>
							task.run(
								async (): Promise<void> =>
									service.setRequired(false, service.state?.revision ?? -1),
							)
						}
					/>
				) : undefined}
				<Button
					label="Sign out"
					variant="ghost"
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							await backend.signOut?.();
						});
					}}
				/>
				<Button
					label="Delete account"
					variant="ghost"
					onPress={(): void => router.navigate("/delete-account")}
				/>
				{task.error ? (
					<Text tone="danger" variant="small">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</AuthLayout>
	);
};
