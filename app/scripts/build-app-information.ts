import { mkdir } from "node:fs/promises";
import { appPolicies } from "../src/domain/app-policies";

const root = new URL("../public", import.meta.url).pathname;
const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
const render = (
	title: string,
	intro: string,
	content: string,
	policy = false,
): string =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(intro)}"><title>${escapeHtml(title)} | UWH Club</title><link rel="stylesheet" href="/uwh-club/styles.css"></head><body><main><header><a href="/uwh-club">UWH Club</a><h1>${escapeHtml(title)}</h1>${policy ? "<p>Effective: November 3, 2026 · Operated by Calgary Underwater Hockey Club</p>" : ""}<p>${escapeHtml(intro)}</p></header>${content}<footer><nav aria-label="UWH Club information"><a href="/">Open app</a><a href="/uwh-club/privacy">Privacy Policy</a><a href="/uwh-club/terms">Terms of Use</a><a href="mailto:hello@calgaryuwh.com">Contact</a></nav></footer></main></body></html>`;
await mkdir(`${root}/uwh-club`, { recursive: true });
await Bun.write(
	`${root}/uwh-club.html`,
	render(
		"UWH Club",
		"Underwater hockey, organized.",
		'<section><h2>Your club, together</h2><p>Manage schedules, RSVPs, attendance, registrations, messages, and coaching in one place. Players, parents, coaches, and administrators see the information and actions available to their role.</p></section><section><h2>Support</h2><p>UWH Club is operated by Calgary Underwater Hockey Club. For help with your account or your information, contact <a href="mailto:hello@calgaryuwh.com">hello@calgaryuwh.com</a>.</p></section>',
	),
);
for (const page of appPolicies)
	await Bun.write(
		`${root}/uwh-club/${page.slug}.html`,
		render(
			page.title,
			page.intro,
			page.sections
				.map(
					([heading, ...paragraphs]) =>
						`<section><h2>${escapeHtml(heading ?? "")}</h2>${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</section>`,
				)
				.join(""),
			true,
		),
	);
