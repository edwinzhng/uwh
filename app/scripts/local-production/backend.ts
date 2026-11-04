import { resolve } from "node:path";
import { appRoot, readInstance, run } from "./config";
import { localBackendOrigin } from "./policy";

export const localCommand = async (args: string[]): Promise<string> => {
	const config = await readInstance();
	return run([
		process.execPath,
		resolve(appRoot, "node_modules/convex/bin/main.js"),
		...args.slice(0, 1),
		"--url",
		localBackendOrigin,
		"--admin-key",
		config.adminKey,
		...args.slice(1),
	]);
};

export const localFunction = async (
	name: string,
	args: object,
): Promise<unknown> => {
	const output = await localCommand(["run", name, JSON.stringify(args)]);
	return output ? JSON.parse(output) : undefined;
};
