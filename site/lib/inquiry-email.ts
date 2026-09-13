import type { Inquiry } from "./inquiry";
import { trialDateLabel } from "./trial-dates";

const escapeHtml = (text: string): string =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

type InquiryEmail = {
	from: string;
	to: string[];
	reply_to: string;
	subject: string;
	text: string;
	html: string;
};

export const inquiryEmail = (inquiry: Inquiry): InquiryEmail => {
	const name = inquiry.name.trim();
	const email = inquiry.email.trim().toLowerCase();
	const intro = `${name} would like to try underwater hockey.`;
	const closing = `Reply to ${email} to follow up on their sign up.`;
	const sections = [
		{
			heading: "First Session Date",
			lines: [
				inquiry.firstSessionDate
					? trialDateLabel(inquiry.firstSessionDate)
					: "Not selected",
			],
		},
		{
			heading: "Contact",
			lines: [email, ...(inquiry.phone ? [`Phone: ${inquiry.phone}`] : [])],
		},
		{ heading: "Message", lines: [inquiry.message || "No message provided."] },
		{
			heading: "Additional details",
			lines: [
				`Age: ${inquiry.interest === "Adult trial" ? "Adult" : inquiry.interest === "Youth trial" ? "Youth" : "Not specified"}`,
				...(inquiry.gender && inquiry.gender !== "Not specified"
					? [`Gender: ${inquiry.gender}`]
					: []),
				...(inquiry.referral
					? [
							`Heard about us through: ${inquiry.referral === "Other" ? inquiry.referralOther : inquiry.referral}`,
						]
					: []),
			],
		},
	];
	return {
		from: "Calgary Crocs <notifications@calgaryuwh.com>",
		to: ["hello@calgaryuwh.com"],
		reply_to: email,
		subject: `New Player Sign Up: ${name.replace(/\s+/g, " ")}`,
		text: [
			intro,
			...sections.map(({ heading, lines }) => [heading, ...lines].join("\n")),
			closing,
		].join("\n\n"),
		html: [
			escapeHtml(intro),
			...sections.map(({ heading, lines }) =>
				[
					`<strong>${heading}</strong>`,
					...lines.map((line) => escapeHtml(line).replaceAll("\n", "<br>\n")),
				].join("<br>\n"),
			),
			escapeHtml(closing),
		].join("<br>\n<br>\n"),
	};
};
