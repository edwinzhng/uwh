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
			: moduleName.startsWith("@uwhclub/design-system/")
				? resolve(
						root,
						"../packages/design-system/src",
						moduleName.slice("@uwhclub/design-system/".length),
					)
				: moduleName,
		platform,
	);
const config = {
	...defaults,
	maxWorkers: 2,
	watchFolders: [...defaults.watchFolders, resolve(root, "../packages")],
	resolver: {
		...defaults.resolver,
		resolveRequest,
		blockList: [
			...(Array.isArray(defaults.resolver.blockList)
				? defaults.resolver.blockList
				: defaults.resolver.blockList
					? [defaults.resolver.blockList]
					: []),
			/[/\\]app[/\\](?:\.convex|dist)[/\\].*/,
		],
	},
};
export default config;
