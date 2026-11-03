export type GalleryScreen = { id: string; title: string; href: string };
const entries: Record<string, { title?: string; href?: string }> = {
	index: { title: "Home", href: "/" },
	session: { href: "/session?event=club-thu" },
	member: { href: "/member?id=alex" },
	progress: { href: "/progress?id=alex" },
	conversation: { href: "/conversation?id=club" },
};
export const galleryScreen = (name: string): GalleryScreen => ({
	id: name,
	title:
		entries[name]?.title ??
		name
			.replaceAll("-", " ")
			.replace(/^./, (letter): string => letter.toUpperCase()),
	href: entries[name]?.href ?? `/${name}`,
});
export const galleryVariants: GalleryScreen[] = [
	{ id: "home-coach", title: "Home · Coach", href: "/?view=coaching" },
	...(["attendance", "coaching", "shoutouts"] as const).map(
		(tab): GalleryScreen => ({
			id: `session-${tab}`,
			title: `Practice · ${tab}`,
			href: `/session?event=club-thu&tab=${tab}`,
		}),
	),
	...["progress", "membership"].map(
		(tab): GalleryScreen => ({
			id: `account-${tab}`,
			title: `Account · ${tab}`,
			href: `/account?tab=${tab}`,
		}),
	),
	{
		id: "program-chat",
		title: "Chat · Program",
		href: "/conversation?id=room%3Aprogram%3Aclub",
	},
	{
		id: "startup",
		title: "Loading",
		href: "/review-auth?mode=loading",
	},
];
