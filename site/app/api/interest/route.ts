import { createHmac } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { sameOrigin } from "../../../lib/auth";
import { backend, serverKey } from "../../../lib/store";
import { trialDates } from "../../../lib/trial-dates";
export const POST = async (request: Request): Promise<Response> => {
	if (!sameOrigin(request))
		return Response.json({ error: "Invalid request" }, { status: 403 });
	if (Number(request.headers.get("content-length") || 0) > 12000)
		return new Response("Too large", { status: 413 });
	const body = await request.json().catch(() => undefined);
	if (!body || typeof body !== "object")
		return Response.json({ error: "Invalid request" }, { status: 400 });
	if (body.website) return Response.json({ ok: true });
	if (
		typeof body.name !== "string" ||
		!body.name.trim() ||
		body.name.length > 100 ||
		typeof body.email !== "string" ||
		!/^\S+@\S+\.\S+$/.test(body.email) ||
		body.email.length > 200 ||
		typeof body.message !== "string" ||
		body.message.length > 2000 ||
		!["Adult trial", "Youth trial", "Season registration"].includes(
			body.interest,
		)
	)
		return Response.json(
			{ error: "Please check your details." },
			{ status: 400 },
		);
	const extraFields = [
		"phone",
		"gender",
		"firstSessionDate",
		"referral",
		"referralOther",
	];
	if (
		extraFields.some(
			(field) => typeof body[field] !== "string" || body[field].length > 200,
		) ||
		(body.referral === "Other" && !body.referralOther.trim()) ||
		(body.firstSessionDate && !trialDates().includes(body.firstSessionDate))
	)
		return Response.json(
			{ error: "Please check your details." },
			{ status: 400 },
		);
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (secret) {
		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				body: new URLSearchParams({
					secret,
					response: typeof body.token === "string" ? body.token : "",
				}),
			},
		);
		const result = await response.json();
		if (!result.success || result.hostname !== new URL(request.url).hostname)
			return Response.json(
				{ error: "Please complete the verification again." },
				{ status: 400 },
			);
	} else if (process.env.NODE_ENV === "production")
		return Response.json(
			{ error: "The form is temporarily unavailable. Please email the club." },
			{ status: 503 },
		);
	const fingerprint = createHmac("sha256", serverKey())
		.update(
			request.headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ||
				"local",
		)
		.digest("hex");
	try {
		await backend().mutation(
			makeFunctionReference<"mutation">("website:submit"),
			{
				key: serverKey(),
				name: body.name.trim(),
				email: body.email.trim().toLowerCase(),
				message: body.message,
				interest: body.interest,
				phone: body.phone,
				gender: body.gender,
				firstSessionDate: body.firstSessionDate,
				referral: body.referral,
				referralOther: body.referralOther,
				fingerprint,
			},
		);
	} catch {
		return Response.json(
			{
				error:
					"Unable to send. Please wait a moment before trying again, or email the club.",
			},
			{ status: 429 },
		);
	}
	return Response.json({ ok: true });
};
