"use client";
import { atom, useAtom } from "jotai";
import Script from "next/script";
import { type FormEvent, type ReactElement, useMemo } from "react";

export const InterestForm = (): ReactElement => {
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
			<label>
				Your name
				<input name="name" autoComplete="name" required maxLength={100} />
			</label>
			<label>
				Email
				<input
					name="email"
					type="email"
					autoComplete="email"
					required
					maxLength={200}
				/>
			</label>
			<label>
				<span>
					Phone number <small>(optional)</small>
				</span>
				<input name="phone" type="tel" autoComplete="tel" maxLength={40} />
			</label>
			<fieldset className="player-group">
				<legend>Player group</legend>
				<div className="group-segments">
					{["Youth", "Adult"].map((group) => (
						<label key={group}>
							<input
								type="radio"
								name="group"
								value={group}
								required
								defaultChecked={group === "Adult"}
							/>
							<span>{group}</span>
						</label>
					))}
				</div>
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
			<label>
				<span>
					First session date <small>(optional)</small>
				</span>
				<input type="date" name="firstSessionDate" />
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
				<label>
					Please specify
					<input name="referralOther" required maxLength={200} />
				</label>
			)}
			<label className="honeypot" aria-hidden="true">
				Website
				<input name="website" tabIndex={-1} autoComplete="off" />
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
