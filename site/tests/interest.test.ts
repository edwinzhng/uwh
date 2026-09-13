import { afterEach, expect, spyOn, test } from "bun:test";
import { POST } from "../app/api/interest/route";

const originalKey = process.env.RESEND_API_KEY;
const send = spyOn(globalThis, "fetch");
const details = {
	name: "Test Visitor",
	email: "visitor@example.com",
	interest: "Adult trial",
	phone: "",
	gender: "Not specified",
	firstSessionDate: "",
	referral: "Friend",
	referralOther: "",
	message: "Can I join?",
	website: "",
};
const request = (
	body: object = details,
	origin = "https://calgaryuwh.com",
): Request =>
	new Request("https://calgaryuwh.com/api/interest", {
		method: "POST",
		headers: { origin, "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
afterEach((): void => {
	send.mockReset();
	if (originalKey === undefined) delete process.env.RESEND_API_KEY;
	else process.env.RESEND_API_KEY = originalKey;
});
test("inquiries go only to the club with reply-to and stable retry protection", async (): Promise<void> => {
	process.env.RESEND_API_KEY = "test-only";
	send.mockResolvedValue(Response.json({ id: "test-message" }));
	expect((await POST(request())).status).toBe(200);
	expect((await POST(request())).status).toBe(200);
	const first = send.mock.calls.at(0);
	const second = send.mock.calls.at(1);
	expect(first?.at(0)).toBe("https://api.resend.com/emails");
	const payload = JSON.parse(String(first?.[1]?.body));
	expect(payload.to).toEqual(["hello@calgaryuwh.com"]);
	expect(payload.subject).toBe("New Player Sign Up: Test Visitor");
	for (const heading of [
		"First Session Date",
		"Contact",
		"Message",
		"Additional details",
	]) {
		expect(payload.html).toContain(`<strong>${heading}</strong>`);
	}
	expect(payload.reply_to).toBe(details.email);
	expect(payload.text).toContain(details.message);
	expect(payload.text).toContain("Additional details\nAge: Adult");
	expect(payload.text).not.toContain("Adult trial");
	expect(payload.text).not.toContain("Phone: Not specified");
	expect(payload.text).toEndWith(
		"Reply to visitor@example.com to follow up on their sign up.",
	);
	expect(first?.[1]?.headers).toEqual(second?.[1]?.headers);
	expect(JSON.stringify(first?.[1]?.headers)).toContain("Idempotency-Key");
});
test("invalid, cross-origin and honeypot requests do not send email", async (): Promise<void> => {
	process.env.RESEND_API_KEY = "test-only";
	expect((await POST(request(details, "https://other.example"))).status).toBe(
		403,
	);
	expect((await POST(request({ ...details, email: "invalid" }))).status).toBe(
		400,
	);
	expect(
		(await POST(request({ ...details, firstSessionDate: "2020-01-01" })))
			.status,
	).toBe(400);
	expect((await POST(request({ ...details, website: "spam" }))).status).toBe(
		200,
	);
	expect(send).not.toHaveBeenCalled();
});
test("missing configuration and provider failures do not report success", async (): Promise<void> => {
	delete process.env.RESEND_API_KEY;
	expect((await POST(request())).status).toBe(503);
	expect(send).not.toHaveBeenCalled();
	process.env.RESEND_API_KEY = "test-only";
	send.mockResolvedValue(new Response("rejected", { status: 401 }));
	expect((await POST(request())).status).toBe(502);
	send.mockRejectedValue(new Error("timeout"));
	expect((await POST(request())).status).toBe(502);
});

test("email markup escapes visitor content and keeps formatting out of plain text", async (): Promise<void> => {
	process.env.RESEND_API_KEY = "test-only";
	send.mockResolvedValue(Response.json({ id: "test-message" }));
	const message = '<img src=x onerror="alert(1)">\nContact';
	expect(
		(await POST(request({ ...details, message, interest: "Youth trial" })))
			.status,
	).toBe(200);
	const payload = JSON.parse(String(send.mock.calls.at(0)?.[1]?.body));
	expect(payload.text).toContain(message);
	expect(payload.text).toContain("Additional details\nAge: Youth");
	expect(payload.html).toContain("&lt;img");
	expect(payload.html).not.toContain("<img");
	expect(payload.html).toContain("<br>\nContact");
});
test("missing fields and oversized optional values remain invalid", async (): Promise<void> => {
	process.env.RESEND_API_KEY = "test-only";
	expect(
		(await POST(request({ ...details, phone: "x".repeat(201) }))).status,
	).toBe(400);
	expect((await POST(request({ ...details, name: "  " }))).status).toBe(400);
	expect(
		(await POST(request({ ...details, referral: "Other", referralOther: "" })))
			.status,
	).toBe(400);
	expect((await POST(request({ ...details, gender: undefined }))).status).toBe(
		400,
	);
	expect(send).not.toHaveBeenCalled();
});
