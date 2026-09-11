import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useSeasonRecord } from "../backend/use-season-record";
import {
	Badge,
	Button,
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
import type { LedgerChange } from "../domain/season-ledger";
import { defaultSeasonId } from "../domain/seasons";
import { DataPage } from "./data-page";
import { PaymentHistory } from "./payment-history";
import { SeasonLedgerForm } from "./season-ledger-form";
import { SeasonSelect } from "./season-select";
import { useSeason } from "./use-season";
export const SeasonMembership = ({
	personId,
	editable,
}: {
	personId: string;
	editable: boolean;
}): ReactElement => {
	const [season] = useSeason();
	const { record, busy, error, save } = useSeasonRecord(personId, season);
	const [kind, setKind] = useState<LedgerChange["kind"]>();
	return (
		<Stack gap="xl">
			<SeasonSelect isDisabled={busy || Boolean(kind)} />
			{!record ? (
				<LoadingContent />
			) : (
				<>
					<Stack gap="sm">
						<SectionHeading size="small">Registration</SectionHeading>
						<Surface>
							<Stack>
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
							</Stack>
						</Surface>
					</Stack>
					<Stack gap="sm">
						<SectionHeading
							size="small"
							action={
								<Badge
									label={
										record.due > record.paid
											? `${money(record.due - record.paid)} due`
											: record.paid > record.due
												? `${money(record.paid - record.due)} credit`
												: "Settled"
									}
									kind={record.due > record.paid ? "warning" : "success"}
								/>
							}
						>
							Payments
						</SectionHeading>
						<Surface>
							<Stack>
								<Row justify="between">
									<Text variant="small">Dues {money(record.due)}</Text>
									<Text variant="small">Paid {money(record.paid)}</Text>
								</Row>
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
								{season === defaultSeasonId ? (
									<PaymentHistory personId={personId} />
								) : undefined}
							</Stack>
						</Surface>
					</Stack>
					<Stack gap="sm">
						<SectionHeading size="small">History</SectionHeading>
						<Surface>
							<Stack>
								<DataPage
									key={personId + season}
									config={{
										query: api.season_records.history,
										args: { personId, seasonId: season },
										preview: [],
										size: 20,
									}}
								>
									{(entries) => (
										<Stack gap="sm">
											{entries.map((entry) => (
												<Stack key={entry._id} gap="xxs">
													<Row justify="between" wrap>
														<Text variant="small">{entry.note}</Text>
														{entry.kind !== "registration" ? (
															<Text variant="small">
																{entry.kind === "refund" ? "−" : ""}
																{money(entry.amount)}
															</Text>
														) : undefined}
													</Row>
													<Text variant="caption" tone="secondary">
														{entry.date} · {entry.actor} · {entry.kind}
													</Text>
												</Stack>
											))}
											{!entries.length ? (
												<Text variant="small" tone="secondary">
													No changes this season.
												</Text>
											) : undefined}
										</Stack>
									)}
								</DataPage>
							</Stack>
						</Surface>
					</Stack>
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
