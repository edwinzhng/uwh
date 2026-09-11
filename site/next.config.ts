import { resolve } from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
	poweredByHeader: false,
	turbopack: { root: resolve(import.meta.dirname, "..") },
};
export default config;
