import { resolve } from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
	poweredByHeader: false,
	turbopack: { root: resolve(import.meta.dirname, "..") },
	headers: async () => [
		{
			source: "/fonts/:path*",
			headers: [
				{ key: "Cache-Control", value: "public, max-age=31536000, immutable" },
			],
		},
	],
};
export default config;
