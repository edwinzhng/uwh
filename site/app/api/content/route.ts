import { makeFunctionReference } from "convex/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { authorized, sameOrigin } from "../../../lib/auth";
import { isContent } from "../../../lib/content";
import { readJsonBody } from "../../../lib/request-body";
import { backend, serverKey } from "../../../lib/store";
export const POST = async (request: Request): Promise<Response> => {
	if (!sameOrigin(request) || !(await authorized()))
		return Response.json({ error: "Sign in first" }, { status: 401 });
	const parsed = await readJsonBody(request, 100000);
	if (parsed.error) return parsed.error;
	const value = parsed.value;
	if (!isContent(value))
		return Response.json(
			{ error: "Check fields and use HTTPS document links." },
			{ status: 400 },
		);
	await backend().mutation(
		makeFunctionReference<"mutation">("website:saveContent"),
		{ key: serverKey(), json: JSON.stringify(value) },
	);
	revalidateTag("club-content", { expire: 0 });
	revalidatePath("/");
	return Response.json({ ok: true });
};
