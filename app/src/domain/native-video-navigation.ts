export const nativeVideoNavigationAllowed = (
	embed: string,
	candidate: string,
): boolean => {
	if (candidate === "about:blank") return true;
	try {
		const expected = new URL(embed);
		const target = new URL(candidate);
		return (
			(expected.hostname === "www.youtube-nocookie.com"
				? /^\/embed\/[\w-]{11}$/.test(expected.pathname)
				: expected.hostname === "player.vimeo.com" &&
					/^\/video\/\d+$/.test(expected.pathname)) &&
			target.protocol === "https:" &&
			!target.username &&
			!target.password &&
			target.origin === expected.origin &&
			target.pathname === expected.pathname
		);
	} catch {
		return false;
	}
};
