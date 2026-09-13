"use client";

import { atom, useAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import {
	Actions,
	Button,
	Field,
	FieldGroup,
	FieldLabel,
	Form,
	Heading,
	Section,
	Status,
	Text,
	TextArea,
	TextLink,
} from "../design-system";
import type { SiteContent } from "../lib/content";

const messageAtom = atom("");
export const Editor = ({ content }: { content: SiteContent }): ReactElement => {
	const [message, setMessage] = useAtom(messageAtom);
	const router = useRouter();
	const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const value = {
			...content,
			headline: String(form.get("headline")),
			intro: String(form.get("intro")),
			location: String(form.get("location")),
			address: String(form.get("address")),
			practiceNote: String(form.get("practiceNote")),
			email: String(form.get("email")),
			coaches: form
				.getAll("coach-name")
				.map((name, index) => ({
					name: String(name),
					role: String(form.getAll("coach-role").at(index) || ""),
					bio: String(form.getAll("coach-bio").at(index) || ""),
				}))
				.filter((c) => c.name),
			documents: form
				.getAll("doc-title")
				.map((title, index) => ({
					title: String(title),
					url: String(form.getAll("doc-url").at(index) || ""),
					category: String(form.getAll("doc-category").at(index) || ""),
				}))
				.filter((d) => d.title),
		};
		setMessage("Saving…");
		try {
			const response = await fetch("/api/content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(value),
			});
			const result = await response.json();
			setMessage(
				response.ok ? "Published. Your website is up to date." : result.error,
			);
			router.refresh();
		} catch {
			setMessage("Unable to save. Please try again.");
		}
	};
	return (
		<Form variant="admin" onSubmit={save}>
			<Section variant="fields">
				<Heading level={2}>Homepage</Heading>
				<FieldLabel>
					Headline
					<Field
						name="headline"
						defaultValue={content.headline}
						required
						maxLength={119}
					/>
				</FieldLabel>
				<FieldLabel>
					Introduction
					<TextArea name="intro" defaultValue={content.intro} />
				</FieldLabel>
				<FieldLabel>
					Pool name
					<Field name="location" defaultValue={content.location} />
				</FieldLabel>
				<FieldLabel>
					Address
					<Field name="address" defaultValue={content.address} />
				</FieldLabel>
				<FieldLabel>
					Practice information
					<TextArea name="practiceNote" defaultValue={content.practiceNote} />
				</FieldLabel>
				<FieldLabel>
					Contact email
					<Field name="email" type="email" defaultValue={content.email} />
				</FieldLabel>
			</Section>
			<Section variant="editor">
				<Heading level={2}>Coaches</Heading>
				<Text variant="lead">
					Fill a blank row to add a coach. Clear a name to remove a profile.
				</Text>
				{[
					...content.coaches.map((c) => ({ ...c, key: c.name })),
					{ name: "", role: "", bio: "", key: "new-coach-one" },
					{ name: "", role: "", bio: "", key: "new-coach-two" },
				].map((c, index) => (
					<FieldGroup key={c.key} label={`Coach ${index + 1}`}>
						<FieldLabel>
							Name
							<Field name="coach-name" defaultValue={c.name} />
						</FieldLabel>
						<FieldLabel>
							Role
							<Field name="coach-role" defaultValue={c.role} />
						</FieldLabel>
						<FieldLabel>
							Short bio
							<TextArea name="coach-bio" defaultValue={c.bio} />
						</FieldLabel>
					</FieldGroup>
				))}
			</Section>
			<Section variant="editor">
				<Heading level={2}>Documents</Heading>
				<Text variant="lead">
					Link to an existing public document. Clear a title to remove it.
				</Text>
				{[
					...content.documents.map((d) => ({ ...d, key: d.url })),
					{ title: "", url: "", category: "", key: "new-doc-one" },
					{ title: "", url: "", category: "", key: "new-doc-two" },
				].map((d, index) => (
					<FieldGroup key={d.key} label={`Document ${index + 1}`}>
						<FieldLabel>
							Title
							<Field name="doc-title" defaultValue={d.title} />
						</FieldLabel>
						<FieldLabel>
							Category
							<Field name="doc-category" defaultValue={d.category} />
						</FieldLabel>
						<FieldLabel>
							HTTPS link
							<Field name="doc-url" type="url" defaultValue={d.url} />
						</FieldLabel>
					</FieldGroup>
				))}
			</Section>
			<Actions>
				<Button type="submit" disabled={message === "Saving…"}>
					Publish changes
				</Button>
				<TextLink href="/" external>
					View website
				</TextLink>
			</Actions>
			<Status>{message}</Status>
		</Form>
	);
};
