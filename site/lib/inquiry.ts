import { trialDates } from "./trial-dates";

export const inquiryLimits = {
	name: 100,
	email: 200,
	message: 2000,
	interest: 200,
	phone: 200,
	gender: 200,
	firstSessionDate: 200,
	referral: 200,
	referralOther: 200,
};
export type Inquiry = { [Field in keyof typeof inquiryLimits]: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object";

export const isInquiry = (value: unknown): value is Inquiry =>
	isRecord(value) &&
	Object.entries(inquiryLimits).every(
		([field, limit]) =>
			typeof value[field] === "string" && value[field].length <= limit,
	) &&
	typeof value.name === "string" &&
	Boolean(value.name.trim()) &&
	typeof value.email === "string" &&
	/^\S+@\S+\.\S+$/.test(value.email) &&
	["Adult trial", "Youth trial", "Season registration"].includes(
		String(value.interest),
	) &&
	(value.referral !== "Other" || Boolean(String(value.referralOther).trim())) &&
	(!value.firstSessionDate ||
		trialDates().includes(String(value.firstSessionDate)));

export const genderOptions = [
	"Not specified",
	"Female",
	"Male",
	"Non-binary",
	"Prefer not to say",
].map((value) => ({ value, label: value }));
export const referralOptions = [
	{ value: "", label: "Select an option" },
	...[
		"Friend",
		"Social Media",
		"Movie Theatre Ads",
		"Community Signs",
		"Highway Banners",
		"Other",
	].map((value) => ({ value, label: value })),
];
