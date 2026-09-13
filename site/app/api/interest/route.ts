import { createHash } from "node:crypto";
import { sameOrigin } from "../../../lib/auth";
import { isInquiry } from "../../../lib/inquiry";
import { inquiryEmail } from "../../../lib/inquiry-email";
import { readJsonBody } from "../../../lib/request-body";
export const POST = async (request: Request): Promise<Response> => {
	if (!sameOrigin(request))
		return Response.json({ error: "Invalid request" }, { status: 403 });
	const parsed = await readJsonBody(request, 12000);
	if (parsed.error) return parsed.error;
	const body = parsed.value;
	if (!body || typeof body !== "object")
		return Response.json({ error: "Invalid request" }, { status: 400 });
	if ("website" in body && body.website) return Response.json({ ok: true });
	if (!isInquiry(body))
		return Response.json(
			{ error: "Please check your details." },
			{ status: 400 },
		);

	const key = process.env.RESEND_API_KEY?.trim();
	if (!key)
		return Response.json(
			{
				error:
					"The form is temporarily unavailable. Please email hello@calgaryuwh.com.",
			},
			{ status: 503 },
		);
	const payload = JSON.stringify(inquiryEmail(body));
	const idempotencyKey = createHash("sha256").update(payload).digest("hex");
	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			signal: AbortSignal.timeout(15000),
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
				"Idempotency-Key": `website-inquiry/${idempotencyKey}`,
			},
			body: payload,
		});
		if (!response.ok) {
			console.error("Website inquiry email rejected", {
				status: response.status,
			});
			return Response.json(
				{
					error:
						"Unable to send right now. Please try again shortly or email hello@calgaryuwh.com.",
				},
				{ status: 502 },
			);
		}
	} catch {
		return Response.json(
			{
				error:
					"Could not confirm delivery. Please try again; duplicate emails are prevented.",
			},
			{ status: 502 },
		);
	}
	return Response.json({ ok: true });
};
