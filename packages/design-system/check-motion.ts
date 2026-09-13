import { motionDurations, motionEasings, motionEffects } from "./src/motion";

export const inspectMotionTokens = (
	source: string,
	filename: string,
): string[] => {
	const failures: string[] = [];
	const reject = (pattern: RegExp, message: string): void => {
		for (const match of source.matchAll(pattern))
			failures.push(
				`${filename}:${source.slice(0, match.index).split("\n").length} ${message}`,
			);
	};
	if (filename.endsWith(".css")) {
		reject(
			/\b[1-9]\d*(?:\.\d+)?(?:ms|s)\b/g,
			"Use a shared motion duration variable.",
		);
		reject(/cubic-bezier\s*\(/g, "Use a shared motion easing variable.");
		reject(
			/(?:transition|animation)(?:-timing-function)?\s*:[^;{}]*\s(?:ease(?:-in-out|-in|-out)?|linear)(?=\s|;|,|$)/g,
			"Use a shared motion easing variable instead of a CSS keyword.",
		);
		for (const match of source.matchAll(
			/var\(--crocs-(motion|ease)-([\w-]+)\)/g,
		)) {
			const tokens =
				match.at(1) === "motion"
					? { ...motionDurations, ...motionEffects }
					: motionEasings;
			if (!Object.hasOwn(tokens, match.at(2) ?? ""))
				failures.push(`${filename}: Unknown motion token ${match.at(0)}.`);
		}
	} else {
		reject(
			/\b(?:animationDuration|transitionDuration|animationDelay|transitionDelay|duration)\s*:\s*(?:[1-9]\d*|0\.\d+|\.\d+)/g,
			"Use motion.duration instead of a literal animation duration.",
		);
		reject(
			/(?:cubicBezier|Easing\.bezier)\s*\(\s*(?:\d|\.\d)/g,
			"Use motion.easing instead of a literal curve.",
		);
	}
	return failures;
};

export const checkMotionTokens = async (
	root: string,
	patterns: string[],
): Promise<void> => {
	const files = patterns.flatMap((pattern) =>
		Array.from(new Bun.Glob(pattern).scanSync({ cwd: root })),
	);
	const failures = (
		await Promise.all(
			files.map(
				async (file): Promise<string[]> =>
					inspectMotionTokens(await Bun.file(`${root}/${file}`).text(), file),
			),
		)
	).flat();
	if (failures.length) {
		console.error(failures.join("\n"));
		process.exitCode = 1;
	} else console.log(`Motion tokens passed for ${files.length} files.`);
};
