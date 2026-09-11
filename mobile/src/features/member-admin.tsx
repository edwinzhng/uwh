import { type ReactElement, useRef, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	Field,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { applicableTrackers, balance, money } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { ConfirmButton } from "./confirm-button";
import { MemberTrackers } from "./member-trackers";
import { PaymentHistory } from "./payment-history";
import { ReturnLoanButton } from "./return-loan-button";
import { SeasonMembership } from "./season-membership";
import { TrackerField } from "./tracker-field";

export const MemberAdmin = ({
	member,
	readOnly = false,
}: {
	member: Member;
	readOnly?: boolean;
}): ReactElement => {
	const { data, account, dispatch, busy, source } = useApp();
	const editable = account.admin && !readOnly;
	const outstanding = balance(data, member.id);
	const loans = data.loans.filter(
		(entry) => entry.personId === member.id && !entry.returned,
	);
	const [payment, setPayment] = useState(false);
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("E-transfer");
	const paymentAttempt = useRef<string | undefined>(undefined);
	const savePayment = async (): Promise<boolean> => {
		const id = paymentAttempt.current ?? newId();
		paymentAttempt.current = id;
		if (
			await dispatch({
				type: "payment",
				payment: {
					id,
					personId: member.id,
					amount: Math.round(Number(amount) * 100),
					note,
				},
			})
		) {
			setPayment(false);
			setAmount("");
			paymentAttempt.current = undefined;
			return true;
		}
		return false;
	};
	return (
		<Stack gap="xl">
			{source === "convex" ? (
				<>
					<SeasonMembership personId={member.id} editable={editable} />
					<MemberTrackers member={member} editable={editable} />
				</>
			) : (
				<>
					<Stack gap="sm">
						<SectionHeading size="small">Registration</SectionHeading>
						<Surface>
							<Stack>
								{editable ? (
									<Select
										label="Status"
										value={member.registration}
										options={[
											{ value: "missing", label: "Missing" },
											{ value: "submitted", label: "Awaiting review" },
											{ value: "approved", label: "Approved" },
										]}
										onValueChange={(status): void => {
											if (status)
												void dispatch({
													type: "registration",
													personId: member.id,
													status,
												});
										}}
										isDisabled={busy}
									/>
								) : (
									<Badge
										label={
											member.registration === "approved"
												? "Approved"
												: member.registration === "submitted"
													? "Awaiting review"
													: "Incomplete"
										}
										kind={
											member.registration === "approved" ? "success" : "warning"
										}
									/>
								)}
								{applicableTrackers(data, member).map((tracker) =>
									editable ? (
										<TrackerField
											key={member.id + tracker.id}
											member={member}
											tracker={tracker}
										/>
									) : (
										<Row key={tracker.id} justify="between">
											<Text variant="small">{tracker.name}</Text>
											<Text variant="small" tone="secondary">
												{tracker.kind === "check"
													? ["yes", "Active"].includes(
															data.trackerValues[
																`${tracker.id}:${member.id}`
															] ?? "",
														)
														? "Yes"
														: "No"
													: data.trackerValues[`${tracker.id}:${member.id}`] ||
														"Missing"}
											</Text>
										</Row>
									),
								)}
							</Stack>
						</Surface>
					</Stack>
					<Stack gap="sm">
						<SectionHeading
							size="small"
							action={
								<Badge
									label={outstanding > 0 ? `${money(outstanding)} due` : "Paid"}
									kind={outstanding > 0 ? "warning" : "success"}
								/>
							}
						>
							Payments
						</SectionHeading>
						<Surface>
							<Stack>
								<PaymentHistory personId={member.id} />
								{editable && outstanding > 0 ? (
									<Row justify="end">
										<Button
											label="Record payment"
											variant="secondary"
											onPress={(): void => {
												setAmount(String(outstanding / 100));
												setPayment(true);
											}}
										/>
									</Row>
								) : undefined}
							</Stack>
						</Surface>
					</Stack>
				</>
			)}
			<Stack gap="sm">
				<SectionHeading size="small">Equipment</SectionHeading>
				<Surface>
					<Stack>
						{loans.length ? (
							loans.map((loan) => (
								<Row key={loan.id} justify="between" wrap>
									<Stack gap="xxs">
										<Text variant="label">
											{
												data.equipment.find((item) => item.id === loan.itemId)
													?.name
											}
										</Text>
										<Text variant="small" tone="secondary">
											Due {loan.due}
										</Text>
									</Stack>
									{editable ? (
										<ReturnLoanButton loan={loan} />
									) : (
										<Badge label="On loan" />
									)}
								</Row>
							))
						) : (
							<EmptyState
								title="No loans"
								description="Equipment issued to this member will appear here."
							/>
						)}
					</Stack>
				</Surface>
			</Stack>
			<Dialog
				staffRole="admin"
				title={`Record payment · ${member.name}`}
				isOpen={payment}
				onOpenChange={setPayment}
				footer={
					<ConfirmButton
						label="Record payment"
						title="Record payment?"
						description={`Record ${money(Math.round(Number(amount) * 100))} received from ${member.name}. This entry can’t be undone.`}
						confirmLabel="Record payment"
						validationError={
							busy ||
							!Number.isFinite(Number(amount)) ||
							Number(amount) <= 0 ||
							Math.round(Number(amount) * 100) > outstanding
								? "Check the required fields"
								: undefined
						}
						onConfirm={savePayment}
					/>
				}
			>
				<Stack>
					<Field
						label="Amount (CAD)"
						inputMode="decimal"
						value={amount}
						onValueChange={setAmount}
					/>
					<Field
						label="Method or reference"
						value={note}
						onValueChange={setNote}
					/>
					<Text variant="caption" tone="secondary">
						Records a payment already received.
					</Text>
				</Stack>
			</Dialog>
		</Stack>
	);
};
