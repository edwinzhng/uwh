"use client";
import { atom, useAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
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
		<form className="form admin-form" onSubmit={save}>
			<section className="form admin-section">
				<h2>Homepage</h2>
				<label>
					Headline
					<input
						name="headline"
						defaultValue={content.headline}
						required
						maxLength={119}
					/>
				</label>
				<label>
					Introduction
					<textarea name="intro" defaultValue={content.intro} />
				</label>
				<label>
					Pool name
					<input name="location" defaultValue={content.location} />
				</label>
				<label>
					Address
					<input name="address" defaultValue={content.address} />
				</label>
				<label>
					Practice information
					<textarea name="practiceNote" defaultValue={content.practiceNote} />
				</label>
				<label>
					Contact email
					<input name="email" type="email" defaultValue={content.email} />
				</label>
			</section>
			<section className="admin-section">
				<h2>Coaches</h2>
				<p className="lede">
					Fill a blank row to add a coach. Clear a name to remove a profile.
				</p>
				{[
					...content.coaches.map((c) => ({ ...c, key: c.name })),
					{ name: "", role: "", bio: "", key: "new-coach-one" },
					{ name: "", role: "", bio: "", key: "new-coach-two" },
				].map((c, index) => (
					<fieldset className="form admin-row" key={c.key}>
						<legend>Coach {index + 1}</legend>
						<label>
							Name
							<input name="coach-name" defaultValue={c.name} />
						</label>
						<label>
							Role
							<input name="coach-role" defaultValue={c.role} />
						</label>
						<label>
							Short bio
							<textarea name="coach-bio" defaultValue={c.bio} />
						</label>
					</fieldset>
				))}
			</section>
			<section className="admin-section">
				<h2>Documents</h2>
				<p className="lede">
					Link to an existing public document. Clear a title to remove it.
				</p>
				{[
					...content.documents.map((d) => ({ ...d, key: d.url })),
					{ title: "", url: "", category: "", key: "new-doc-one" },
					{ title: "", url: "", category: "", key: "new-doc-two" },
				].map((d, index) => (
					<fieldset className="form admin-row" key={d.key}>
						<legend>Document {index + 1}</legend>
						<label>
							Title
							<input name="doc-title" defaultValue={d.title} />
						</label>
						<label>
							Category
							<input name="doc-category" defaultValue={d.category} />
						</label>
						<label>
							HTTPS link
							<input name="doc-url" type="url" defaultValue={d.url} />
						</label>
					</fieldset>
				))}
			</section>
			<div className="admin-actions">
				<button
					className="button button-green"
					type="submit"
					disabled={message === "Saving…"}
				>
					Publish changes
				</button>
				<a href="/" target="_blank" rel="noreferrer">
					View website
				</a>
			</div>
			<output>{message}</output>
		</form>
	);
};
