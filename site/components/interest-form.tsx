"use client";

import { atom, useAtom } from "jotai";
import { type FormEvent, type ReactElement, useId, useMemo } from "react";
import {
	Button,
	Field,
	FieldGroup,
	FieldLabel,
	Form,
	Hint,
	Honeypot,
	Inline,
	SegmentedControl,
	Select,
	Status,
	Text,
	TextArea,
	Turnstile,
} from "../design-system";

import { trialDateLabel, trialDates } from "../lib/trial-dates";

export const InterestForm = (): ReactElement => {
	const fieldId = useId();
	const [status, setStatus] = useAtom(useMemo(() => atom(""), []));
	const [referral, setReferral] = useAtom(useMemo(() => atom(""), []));
	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setStatus("Sending…");
		try {
			const response = await fetch("/api/interest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: form.get("name"),
					email: form.get("email"),
					interest: `${form.get("group")} trial`,
					phone: form.get("phone"),
					gender: form.get("gender"),
					firstSessionDate: form.get("firstSessionDate"),
					referral: form.get("referral"),
					referralOther: form.get("referralOther") ?? "",
					message: form.get("message"),
					website: form.get("website"),
					token: form.get("cf-turnstile-response"),
				}),
			});
			const result = await response.json();
			setStatus(response.ok ? "Received" : result.error);
		} catch {
			setStatus("Could not connect. Please try again.");
		}
	};
	if (status === "Received")
		return (
			<Status notice>
				Thanks for getting in touch. We’ll email you about the next steps.
			</Status>
		);
	return (
		<Form onSubmit={submit}>
			<FieldLabel htmlFor={`${fieldId}-name`}>
				Your name
				<Field
					id={`${fieldId}-name`}
					name="name"
					autoComplete="name"
					required
					maxLength={100}
				/>
			</FieldLabel>
			<FieldLabel htmlFor={`${fieldId}-email`}>
				Email
				<Field
					id={`${fieldId}-email`}
					name="email"
					type="email"
					autoComplete="email"
					required
					maxLength={200}
				/>
			</FieldLabel>
			<FieldLabel htmlFor={`${fieldId}-phone`}>
				<Inline>
					Phone number <Hint>(optional)</Hint>
				</Inline>
				<Field
					id={`${fieldId}-phone`}
					name="phone"
					type="tel"
					autoComplete="tel"
					maxLength={40}
				/>
			</FieldLabel>
			<FieldGroup variant="player" label="Player group">
				<SegmentedControl
					name="group"
					defaultValue="Adult"
					required
					options={[
						{ value: "Youth", label: "Youth" },
						{ value: "Adult", label: "Adult" },
					]}
				/>
			</FieldGroup>
			<FieldLabel>
				<Inline>
					Gender <Hint>(optional)</Hint>
				</Inline>
				<Select
					name="gender"
					defaultValue="Not specified"
					options={[
						"Not specified",
						"Female",
						"Male",
						"Non-binary",
						"Prefer not to say",
					].map((value) => ({ value, label: value }))}
				/>
			</FieldLabel>
			<FieldLabel htmlFor={`${fieldId}-firstSessionDate`}>
				<Inline>
					First session date <Hint>(optional)</Hint>
				</Inline>
				<Select
					id={`${fieldId}-firstSessionDate`}
					name="firstSessionDate"
					defaultValue=""
					options={[
						{ value: "", label: "Choose a Sunday" },
						...trialDates().map((date) => ({
							value: date,
							label: trialDateLabel(date),
						})),
					]}
				/>
				<Hint>
					Sunday trials · next two months. We’ll confirm your session time by
					email.
				</Hint>
			</FieldLabel>
			<FieldLabel>
				<Inline>
					Message <Hint>(optional)</Hint>
				</Inline>
				<TextArea
					name="message"
					rows={2}
					maxLength={2000}
					placeholder="Questions, comments, e.g. will you be bringing other friends/family"
				/>
			</FieldLabel>
			<FieldLabel>
				<Inline>
					How did you hear about us? <Hint>(optional)</Hint>
				</Inline>
				<Select
					name="referral"
					value={referral}
					onChange={(event): void => setReferral(event.target.value)}
					options={[
						{ value: "", label: "Select an option" },
						...[
							"Friend",
							"Social Media",
							"Movie Theatre Ads",
							"Community Signs",
							"Highway Banners",
							"Other",
						].map((value) => ({ value, label: value })),
					]}
				/>
			</FieldLabel>
			{referral === "Other" && (
				<FieldLabel htmlFor={`${fieldId}-referralOther`}>
					Please specify
					<Field
						id={`${fieldId}-referralOther`}
						name="referralOther"
						required
						maxLength={200}
					/>
				</FieldLabel>
			)}
			<Honeypot id={`${fieldId}-website`} />
			<Hint>
				For youth players, please use a parent or guardian’s contact details.
				We’ll only use these details to respond to your inquiry.
			</Hint>
			{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
				<Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
			) : undefined}
			<Button disabled={status === "Sending…"} type="submit">
				{status === "Sending…" ? status : "Send inquiry"}
			</Button>
			{status && status !== "Sending…" ? (
				<Text variant="error" role="alert">
					{status}
				</Text>
			) : undefined}
		</Form>
	);
};
