import { resolve } from "node:path";

export const appRoot = resolve(import.meta.dir, "../..");
export const copyRoot = resolve(appRoot, "../data/local-production");
export const runtimeRoot = resolve(copyRoot, "source");
export type LocalInstance = {
	adminKey: string;
	secret: string;
	binary: string;
	instance: "uwh-production-copy";
};
export const readInstance = async (): Promise<LocalInstance> => {
	const value: unknown = await Bun.file(
		resolve(copyRoot, "instance.json"),
	).json();
	if (
		typeof value !== "object" ||
		value === null ||
		!("adminKey" in value) ||
		typeof value.adminKey !== "string" ||
		!("secret" in value) ||
		typeof value.secret !== "string" ||
		!("binary" in value) ||
		typeof value.binary !== "string" ||
		!("instance" in value) ||
		value.instance !== "uwh-production-copy"
	)
		throw new Error(
			"Local production-copy instance is unavailable. Run setup first.",
		);
	return {
		adminKey: value.adminKey,
		secret: value.secret,
		binary: value.binary,
		instance: value.instance,
	};
};

export const run = async (
	command: string[],
	cwd = appRoot,
): Promise<string> => {
	const child = Bun.spawn(command, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...Object.fromEntries(
				Object.entries(process.env).filter(
					([name]) =>
						![
							"CONVEX_DEPLOYMENT",
							"CONVEX_DEPLOY_KEY",
							"CONVEX_SELF_HOSTED_URL",
							"CONVEX_SELF_HOSTED_ADMIN_KEY",
						].includes(name),
				),
			),
			EXPO_NO_DOTENV: "1",
		},
	});
	const [output, error, status] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (status !== 0) {
		await Bun.write(resolve(copyRoot, "last-command-error.log"), error);
		throw new Error(
			"Local command failed. See the private local-production error log.",
		);
	}
	return output.trim();
};
