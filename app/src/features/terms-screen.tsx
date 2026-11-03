import { type ReactElement, useState } from "react";
import {
	type TermsService,
	useLiveTerms,
	usePreviewTerms,
} from "../backend/use-terms";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	LoadingContent,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { displayDate } from "../domain/date-display";
import { ClubShell } from "./club-shell";
import { TermsAcceptance } from "./terms-acceptance";
import { TermsEditor } from "./terms-editor";
import { TermsPolicy } from "./terms-policy";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

const TermsWorkspace = ({
	service,
}: {
	service: TermsService;
}): ReactElement => {
	const review = useReviewFlow();
	const [editing, setEditing] = useState(review === "terms-publish");
	const task = useFormTask();
	const state = service.state;
	return (
		<ClubShell
			title="Club terms"
			action={
				state?.canManage ? (
					<Button
						label="Publish new version"
						onPress={(): void => setEditing(true)}
					/>
				) : undefined
			}
		>
			{!state ? (
				<LoadingContent />
			) : (
				<Stack>
					{state.policy ? (
						<Surface>
							<Stack>
								<Row wrap>
									<Badge label={state.required ? "Required" : "Not required"} />
									<Badge
										label={state.acceptedAt ? "Accepted" : "Not accepted"}
										kind={state.acceptedAt ? "success" : undefined}
									/>
								</Row>
								{state.required && !state.accepted ? (
									<TermsAcceptance
										key={state.policy.id}
										policy={state.policy}
										accept={service.accept}
									/>
								) : (
									<TermsPolicy policy={state.policy} />
								)}
								{state.acceptedAt ? (
									<Text variant="caption" tone="secondary">
										Accepted {displayDate(state.acceptedAt)}
									</Text>
								) : undefined}
								{state.canManage ? (
									<Button
										label={
											state.required
												? "Stop requiring this version"
												: "Require this version"
										}
										variant="ghost"
										isLoading={task.busy}
										onPress={(): void => {
											void task.run(() =>
												service.setRequired(!state.required, state.revision),
											);
										}}
									/>
								) : undefined}
							</Stack>
						</Surface>
					) : (
						<Text tone="secondary">
							No club terms have been published. An administrator can publish
							the club’s approved policy.
						</Text>
					)}
					{task.error ? (
						<Text tone="danger" variant="small">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			)}
			{editing && state?.canManage ? (
				<TermsEditor
					service={service}
					onClose={(): void => setEditing(false)}
				/>
			) : undefined}
		</ClubShell>
	);
};
const LiveTermsScreen = (): ReactElement => (
	<TermsWorkspace service={useLiveTerms()} />
);
const PreviewTermsScreen = (): ReactElement => (
	<TermsWorkspace service={usePreviewTerms()} />
);
export const TermsScreen = (): ReactElement =>
	useApp().source === "convex" ? <LiveTermsScreen /> : <PreviewTermsScreen />;
