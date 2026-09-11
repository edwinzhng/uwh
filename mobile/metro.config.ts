import { resolve } from "node:path";
import { getDefaultConfig } from "expo/metro-config.js";
import type { CustomResolver } from "metro-resolver";

const root = import.meta.dirname;
const defaults = getDefaultConfig(root);
const resolveRequest: CustomResolver = (
	context,
	moduleName,
	platform,
): ReturnType<CustomResolver> =>
	context.resolveRequest(
		context,
		/^(react|react-dom)(\/|$)/.test(moduleName)
			? resolve(root, "node_modules", moduleName)
			: moduleName,
		platform,
	);
const config = {
	...defaults,
	watchFolders: [...defaults.watchFolders, resolve(root, "../packages")],
	resolver: { ...defaults.resolver, resolveRequest },
};
export default config;
