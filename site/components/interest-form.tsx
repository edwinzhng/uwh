"use client";
import { Field } from "@calgarycrocs/design-system/field";
import { SegmentedControl } from "@calgarycrocs/design-system/segmented-control";
import { atom, useAtom } from "jotai";
import Script from "next/script";
import { type FormEvent, type ReactElement, useId, useMemo } from "react";

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
			<output className="notice">
				Thanks for getting in touch. We’ll email you about the next steps.
			</output>
		);
	return (
		<form className="form" onSubmit={submit}>
			<label htmlFor={`${fieldId}-name`}>
				Your name
				<Field
					id={`${fieldId}-name`}
					name="name"
					autoComplete="name"
					required
					maxLength={100}
				/>
			</label>
			<label htmlFor={`${fieldId}-email`}>
				Email
				<Field
					id={`${fieldId}-email`}
					name="email"
					type="email"
					autoComplete="email"
					required
					maxLength={200}
				/>
			</label>
			<label htmlFor={`${fieldId}-phone`}>
				<span>
					Phone number <small>(optional)</small>
				</span>
				<Field
					id={`${fieldId}-phone`}
					name="phone"
					type="tel"
					autoComplete="tel"
					maxLength={40}
				/>
			</label>
			<fieldset className="player-group">
				<legend>Player group</legend>
				<SegmentedControl
					name="group"
					defaultValue="Adult"
					required
					className="group-segments"
					options={[
						{ value: "Youth", label: "Youth" },
						{ value: "Adult", label: "Adult" },
					]}
				/>
			</fieldset>
			<label>
				<span>
					Gender <small>(optional)</small>
				</span>
				<select name="gender" defaultValue="Not specified">
					{[
						"Not specified",
						"Female",
						"Male",
						"Non-binary",
						"Prefer not to say",
					].map((gender) => (
						<option key={gender}>{gender}</option>
					))}
				</select>
			</label>
			<label htmlFor={`${fieldId}-firstSessionDate`}>
				<span>
					First session date <small>(optional)</small>
				</span>
				<select
					id={`${fieldId}-firstSessionDate`}
					name="firstSessionDate"
					defaultValue=""
				>
					<option value="">Choose a Sunday</option>
					{trialDates().map((date) => (
						<option key={date} value={date}>
							{trialDateLabel(date)}
						</option>
					))}
				</select>
				<small>
					Sunday trials · next two months. We’ll confirm your session time by
					email.
				</small>
			</label>
			<label>
				<span>
					Message <small>(optional)</small>
				</span>
				<textarea
					name="message"
					rows={2}
					maxLength={2000}
					placeholder="Questions, comments, e.g. will you be bringing other friends/family"
				/>
			</label>
			<label>
				<span>
					How did you hear about us? <small>(optional)</small>
				</span>
				<select
					name="referral"
					value={referral}
					onChange={(event) => setReferral(event.target.value)}
				>
					<option value="">Select an option</option>
					{[
						"Friend",
						"Social Media",
						"Movie Theatre Ads",
						"Community Signs",
						"Highway Banners",
						"Other",
					].map((source) => (
						<option key={source}>{source}</option>
					))}
				</select>
			</label>
			{referral === "Other" && (
				<label htmlFor={`${fieldId}-referralOther`}>
					Please specify
					<Field
						id={`${fieldId}-referralOther`}
						name="referralOther"
						required
						maxLength={200}
					/>
				</label>
			)}
			<label
				className="honeypot"
				aria-hidden="true"
				htmlFor={`${fieldId}-website`}
			>
				Website
				<Field
					id={`${fieldId}-website`}
					name="website"
					tabIndex={-1}
					autoComplete="off"
				/>
			</label>
			<small>
				For youth players, please use a parent or guardian’s contact details.
				We’ll only use these details to respond to your inquiry.
			</small>
			{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
				<>
					<Script
						src="https://challenges.cloudflare.com/turnstile/v0/api.js"
						strategy="afterInteractive"
					/>
					<div
						className="cf-turnstile"
						data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
					/>
				</>
			) : undefined}
			<button
				className="button button-green"
				disabled={status === "Sending…"}
				type="submit"
			>
				{status === "Sending…" ? status : "Send inquiry"}
			</button>
			{status && status !== "Sending…" ? (
				<p className="error" role="alert">
					{status}
				</p>
			) : undefined}
		</form>
	);
};
