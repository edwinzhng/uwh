import { createHmac } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { cookies } from "next/headers";
import { matchesPassword, sameOrigin, sessionToken } from "../../../lib/auth";
import { readJsonBody } from "../../../lib/request-body";
import { backend, serverKey } from "../../../lib/store";
export const POST = async (request: Request): Promise<Response> => {
	if (!sameOrigin(request))
		return Response.json({ error: "Invalid request" }, { status: 403 });
	const fingerprint = createHmac("sha256", serverKey())
		.update(
			request.headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ||
				"local",
		)
		.digest("hex");
	if (
		!(await backend().mutation(
			makeFunctionReference<"mutation">("website:checkLogin"),
			{ key: serverKey(), fingerprint },
		))
	)
		return Response.json(
			{ error: "Too many attempts. Try again later." },
			{ status: 429 },
		);
	const parsed = await readJsonBody(request, 4096);
	if (parsed.error) return parsed.error;
	const body = parsed.value;
	if (!body || typeof body !== "object")
		return Response.json({ error: "Invalid request" }, { status: 400 });
	if (
		!("password" in body) ||
		typeof body.password !== "string" ||
		!matchesPassword(body.password)
	)
		return Response.json({ error: "Incorrect password" }, { status: 401 });
	(await cookies()).set("website-admin", sessionToken(), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		maxAge: 28800,
	});
	return Response.json({ ok: true });
};
export const DELETE = async (request: Request): Promise<Response> => {
	if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
	(await cookies()).delete("website-admin");
	return Response.json({ ok: true });
};
