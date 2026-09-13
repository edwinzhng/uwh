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
	SegmentedControl,
	Select,
	Status,
	Text,
	TextArea,
} from "../design-system";

import { genderOptions, inquiryLimits, referralOptions } from "../lib/inquiry";
import { trialDateLabel, trialDates } from "../lib/trial-dates";
import { useFormTask } from "../lib/use-form-task";

export const InterestForm = (): ReactElement => {
	const fieldId = useId();
	const task = useFormTask();
	const [received, setReceived] = useAtom(useMemo(() => atom(false), []));
	const [referral, setReferral] = useAtom(useMemo(() => atom(""), []));
	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		await task.submit(
			() => undefined,
			async (): Promise<void> => {
				const response = await fetch("/api/interest", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...Object.fromEntries(
							Object.keys(inquiryLimits).map((field) => [
								field,
								form.get(field) ?? "",
							]),
						),
						interest: `${form.get("group")} trial`,
						website: form.get("website"),
					}),
				});
				if (response.status === 429)
					throw new Error(
						"Too many attempts. Please try again later or email hello@calgaryuwh.com.",
					);
				const result: unknown = await response.json();
				if (!response.ok)
					throw new Error(
						result &&
							typeof result === "object" &&
							"error" in result &&
							typeof result.error === "string"
							? result.error
							: "Unable to send. Please try again shortly.",
					);
				setReceived(true);
			},
		);
	};
	if (received)
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
			<FieldLabel htmlFor={`${fieldId}-phone`} label="Phone number" optional>
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
			<FieldLabel label="Gender" optional>
				<Select
					name="gender"
					defaultValue="Not specified"
					options={genderOptions}
				/>
			</FieldLabel>
			<FieldLabel
				htmlFor={`${fieldId}-firstSessionDate`}
				label="First session date"
				optional
			>
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
				<Hint>Sundays are our beginner tryout days.</Hint>
			</FieldLabel>
			<FieldLabel label="Message" optional>
				<TextArea
					name="message"
					rows={2}
					maxLength={2000}
					placeholder="Questions, comments, e.g. will you be bringing other friends/family"
				/>
			</FieldLabel>
			<FieldLabel label="How did you hear about us?" optional>
				<Select
					name="referral"
					value={referral}
					onValueChange={setReferral}
					options={referralOptions}
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
			<Button disabled={task.busy} type="submit">
				{task.busy ? "Sending…" : "Send inquiry"}
			</Button>
			{task.error ? (
				<Text variant="error" role="alert">
					{task.error}
				</Text>
			) : undefined}
		</Form>
	);
};
