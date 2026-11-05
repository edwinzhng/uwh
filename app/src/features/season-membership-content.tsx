import { type ReactElement, type ReactNode, useState } from "react";
import type { SeasonRecordController } from "../backend/use-season-record";
import {
	Badge,
	Button,
	Dialog,
	Disclosure,
	LoadingContent,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import { money } from "../domain/app-rules";
import { seasonBalance } from "../domain/season-balance";
import type { LedgerChange } from "../domain/season-ledger";
import { defaultSeasonId } from "../domain/seasons";
import { PaymentHistory } from "./payment-history";
import { SeasonLedgerForm } from "./season-ledger-form";
import { SeasonSelect } from "./season-select";
import { useSeason } from "./use-season";
export const SeasonMembershipContent = ({
	personId,
	editable,
	controller,
	history,
	children,
}: {
	personId: string;
	editable: boolean;
	controller: SeasonRecordController;
	history: ReactNode;
	children?: ReactNode;
}): ReactElement => {
	const [season] = useSeason();
	const { record, busy, error, save } = controller;
	const [kind, setKind] = useState<LedgerChange["kind"]>();
	const [historyScope, setHistoryScope] = useState<string>();
	const scope = JSON.stringify([personId, season]);
	const historyOpen = historyScope === scope;
	const balance = record ? seasonBalance(record) : undefined;
	return (
		<Stack gap="section">
			<SeasonSelect isDisabled={busy || Boolean(kind)} />
			{!record || !balance ? (
				<LoadingContent />
			) : (
				<>
					<Stack gap="heading">
						<SectionHeading>Registration</SectionHeading>
						<Surface>
							<Stack>
								{editable ? (
									<>
										<Select
											label="Status"
											value={record.registration}
											isDisabled={!editable || busy}
											options={[
												{ value: "missing", label: "Missing" },
												{ value: "submitted", label: "Awaiting review" },
												{ value: "approved", label: "Approved" },
											]}
											onValueChange={(status): void => {
												if (status)
													void save({
														kind: "registration",
														status,
														cuga: record.cuga,
													});
											}}
										/>
										<Toggle
											label="CUGA membership"
											value={record.cuga}
											isDisabled={!editable || busy}
											onValueChange={(cuga): void => {
												void save({
													kind: "registration",
													status: record.registration,
													cuga,
												});
											}}
										/>
									</>
								) : (
									<>
										<Row justify="between" wrap>
											<Text>Registration</Text>
											<Badge
												label={
													record.registration === "approved"
														? "Approved"
														: record.registration === "submitted"
															? "Awaiting review"
															: "Missing"
												}
												kind={
													record.registration === "approved"
														? "success"
														: record.registration === "submitted"
															? "pending"
															: "warning"
												}
											/>
										</Row>
										<Row justify="between" wrap>
											<Text>CUGA membership</Text>
											<Badge
												label={record.cuga ? "Confirmed" : "Not confirmed"}
												kind={record.cuga ? "success" : "warning"}
											/>
										</Row>
									</>
								)}
							</Stack>
						</Surface>
					</Stack>
					<Stack gap="heading">
						<SectionHeading>Payments</SectionHeading>
						<Surface>
							<Stack>
								<Row justify="between" wrap>
									<Stack gap="xxs">
										<Text variant="caption" tone="secondary">
											{balance.label}
										</Text>
										<Text variant="number">{money(balance.amount)}</Text>
									</Stack>
									<Badge label={balance.status} kind={balance.tone} />
								</Row>
								<Disclosure title="Dues & payments" defaultOpen={editable}>
									<Stack gap="xs">
										<Row justify="between">
											<Text variant="small" tone="secondary">
												Season dues
											</Text>
											<Text variant="small">{money(record.due)}</Text>
										</Row>
										<Row justify="between">
											<Text variant="small" tone="secondary">
												Paid
											</Text>
											<Text variant="small">{money(record.paid)}</Text>
										</Row>
									</Stack>
								</Disclosure>
								{editable ? (
									<Row wrap>
										<Button
											label="Set dues"
											variant="secondary"
											onPress={(): void => setKind("dues")}
										/>
										{record.due > record.paid ? (
											<Button
												label="Record payment"
												onPress={(): void => setKind("payment")}
											/>
										) : undefined}
										{record.paid > 0 ? (
											<Button
												label="Record refund"
												variant="ghost"
												onPress={(): void => setKind("refund")}
											/>
										) : undefined}
									</Row>
								) : undefined}
							</Stack>
						</Surface>
					</Stack>
					{children}
					<Row>
						<Button
							label="History"
							prefix="clock"
							variant="secondary"
							onPress={(): void => setHistoryScope(scope)}
						/>
					</Row>
					<Dialog
						key={scope}
						title="Membership history"
						isOpen={historyOpen}
						onOpenChange={(open): void =>
							setHistoryScope(open ? scope : undefined)
						}
						footer={false}
					>
						<Stack gap="lg">
							{season === defaultSeasonId ? (
								<Stack gap="heading">
									<SectionHeading>Payment records</SectionHeading>
									<PaymentHistory personId={personId} />
								</Stack>
							) : undefined}
							<Stack gap="heading">
								<SectionHeading>Membership changes</SectionHeading>
								{history}
							</Stack>
						</Stack>
					</Dialog>
					{kind ? (
						<SeasonLedgerForm
							key={personId + season + kind}
							kind={kind}
							record={record}
							busy={busy}
							error={error}
							save={save}
							onClose={(): void => setKind(undefined)}
						/>
					) : undefined}
				</>
			)}
			{error ? (
				<Text tone="danger" variant="small">
					{error}
				</Text>
			) : undefined}
		</Stack>
	);
};
