type ProviderResult =
	| { status: "ok"; id?: string }
	| { status: "error"; details?: { error?: string } };
export type PushOutcome = {
	ticketId?: string;
	error?: string;
	retry: boolean;
	delivered?: boolean;
};
export const pushOutcome = (
	phase: "ticket" | "receipt",
	result: ProviderResult | undefined,
): PushOutcome => {
	if (!result || (phase === "ticket" && result.status === "ok" && !result.id))
		return { error: "DeliveryUnavailable", retry: true };
	if (result.status === "error")
		return {
			error:
				result.details?.error ??
				(phase === "ticket" ? "PushRejected" : "ReceiptRejected"),
			retry: result.details?.error === "MessageRateExceeded",
		};
	return phase === "ticket"
		? { ticketId: result.id, retry: false }
		: { delivered: true, retry: false };
};
