import ts from "typescript";

const navigatorFiles = new Set([
	"app-router.tsx",
	"app-router.native.tsx",
	"main-tabs-fallback.tsx",
	"main-tabs.native.tsx",
]);
const contentFiles = new Set(["app-layout.tsx", "tab-content.tsx"]);

export const inspectNavigationBoundary = (
	source: string,
	filename: string,
): string[] => {
	const basename = filename.split("/").at(-1) ?? filename;
	const navigator = navigatorFiles.has(basename);
	const content = contentFiles.has(basename);
	const shell = [
		"app-layout.tsx",
		"club-shell.tsx",
		"page-material-background.tsx",
		"family-menu.tsx",
	].includes(basename);
	const home =
		/(?:features\/home-[^/]+|backend\/home-fitness-data)\.tsx$/.test(
			filename,
		) ||
		[
			"thread-practice.tsx",
			"thread-extras.tsx",
			"event-preview-actions.tsx",
			"recognition-summary.tsx",
		].includes(basename);
	if (!navigator && !content && !home && !shell) return [];
	const file = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const failures: string[] = [];
	const found = { surfaces: 0, animations: 0, readiness: 0 };
	const fail = (node: ts.Node, reason: string): void => {
		failures.push(
			`${filename}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${reason}`,
		);
	};
	const inspectSurface = (node: ts.Node, value: ts.Expression): void => {
		found.surfaces += 1;
		const background = ts.isObjectLiteralExpression(value)
			? value.properties.find(
					(property) =>
						ts.isPropertyAssignment(property) &&
						property.name.getText(file) === "backgroundColor",
				)
			: undefined;
		const color =
			background && ts.isPropertyAssignment(background)
				? background.initializer
				: undefined;
		if (
			!color ||
			!(
				/\.background\.(canvas|primary)$/.test(color.getText(file)) ||
				(ts.isStringLiteral(color) && /^#[\da-f]{6}$/i.test(color.text))
			)
		)
			fail(
				node,
				"Navigation scenes must have an opaque theme background so loading cannot expose the parent route.",
			);
	};
	const inspect = (node: ts.Node): void => {
		if (
			shell &&
			ts.isImportSpecifier(node) &&
			["usePathname", "useSegments", "useGlobalSearchParams"].includes(
				(node.propertyName ?? node.name).text,
			)
		)
			fail(
				node,
				"Screen layout must use its own route and local parameters; global route changes must not resize mounted background screens.",
			);
		if (
			basename === "app-layout.tsx" &&
			ts.isImportSpecifier(node) &&
			(node.propertyName ?? node.name).text === "SafeAreaView"
		)
			fail(
				node,
				"The shared shell must use React safe-area insets for padding and readiness; native SafeAreaView updates can shift an already visible page.",
			);
		if (navigator && ts.isPropertyAssignment(node)) {
			const name = node.name.getText(file);
			if (name === "animation") {
				found.animations += 1;
				if (
					basename === "app-router.native.tsx"
						? !ts.isCallExpression(node.initializer) ||
							node.initializer.expression.getText(file) !==
								"nativeStackAnimation"
						: !ts.isStringLiteral(node.initializer) ||
							node.initializer.text !== "none"
				)
					fail(
						node,
						"Web and tab navigation must switch instantly; native detail screens must use the shared reduced-motion stack policy.",
					);
			}
			if (name === "animationDuration")
				fail(node, "Navigation does not have an animation duration.");
			if (name === "contentStyle" || name === "sceneStyle")
				inspectSurface(node, node.initializer);
		}
		if (
			navigator &&
			ts.isJsxAttribute(node) &&
			["contentStyle", "sceneStyle"].includes(node.name.getText(file))
		) {
			const expression =
				node.initializer && ts.isJsxExpression(node.initializer)
					? node.initializer.expression
					: undefined;
			if (expression) inspectSurface(node, expression);
			else
				fail(node, "Navigation scene backgrounds must be explicit and opaque.");
		}
		if (
			content &&
			ts.isImportDeclaration(node) &&
			ts.isStringLiteral(node.moduleSpecifier) &&
			/(?:reanimated|reveal|framer-motion|^motion)/.test(
				node.moduleSpecifier.text,
			)
		)
			fail(
				node,
				"Page and tab content cannot import animation or reveal wrappers.",
			);
		if (
			content &&
			ts.isPropertySignature(node) &&
			node.name.getText(file) === "transition"
		)
			fail(node, "The page layout cannot expose an opt-in page transition.");
		if (
			content &&
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
		) {
			if (/Reveal|Animated/.test(node.tagName.getText(file)))
				fail(
					node,
					"Page and tab content must appear without a reveal animation.",
				);
			if (node.tagName.getText(file) === "PageReady") {
				found.readiness += 1;
				if (
					!node.attributes.properties.some(
						(property) =>
							ts.isJsxAttribute(property) &&
							property.name.getText(file) === "contentKey",
					)
				)
					fail(
						node,
						"Page readiness must be keyed to route parameters so a deep link cannot reveal the previous tab.",
					);
			}
		}
		if (home && (ts.isArrowFunction(node) || ts.isFunctionDeclaration(node))) {
			const calls = new Set<string>();
			const collect = (child: ts.Node): void => {
				if (ts.isCallExpression(child))
					calls.add(child.expression.getText(file));
				if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child))
					calls.add(child.tagName.getText(file));
				ts.forEachChild(child, collect);
			};
			collect(node);
			if (
				[
					"useQuery",
					"usePaginatedQuery",
					"useMessaging",
					"useThreadTools",
				].some((name) => calls.has(name)) &&
				!["usePageLoading", "LoadingContent", "LoadingBoundary"].some((name) =>
					calls.has(name),
				)
			)
				fail(
					node,
					"Initial layout queries must register loading with usePageLoading before optional sections appear.",
				);
		}
		ts.forEachChild(node, inspect);
	};
	inspect(file);
	if (navigator && found.surfaces === 0)
		fail(file, "Navigation must declare an opaque scene surface.");
	if (
		navigator &&
		basename !== "main-tabs.native.tsx" &&
		found.animations === 0
	)
		fail(file, "Navigation must explicitly disable scene animations.");
	if (basename === "app-layout.tsx" && found.readiness === 0)
		fail(
			file,
			"Page layouts must coordinate initial loading through PageReady.",
		);
	return failures;
};
