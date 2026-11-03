import { expect, test } from "bun:test";
import ts from "typescript";

const policies = [
	{
		busy: "task.busy",
		intent: "form",
		files: [
			"fitness-session-form",
			"program-editor",
			"equipment-loan-form",
			"program-coaching-editor",
			"fitness-quick-log-form",
			"coaching-hours-editor",
			"guardian-invite-form",
			"shoutout-editor",
			"goal-editor",
			"member-editor",
			"invite-member-action",
			"goal-reflection-form",
			"household-profiles",
			"fitness-test-form",
			"member-profile-form",
			"notice-composer",
			"account-name-action",
			"account-password-action",
			"delete-account-action",
			"chat-filter-settings",
			"chat-poll-composer",
			"message-actions",
		],
	},
	{
		busy: "busy",
		intent: "form",
		files: [
			"team-options",
			"equipment-editor",
			"season-ledger-form",
			"feedback-editor",
			"season-settings",
			"settings-screen",
			"member-merge-action",
		],
	},
	{ busy: "saving", intent: "form", files: ["player-coaching-form"] },
	{ busy: "disabled", intent: "form", files: ["resource-editor"] },
	{ busy: "task.busy", intent: "form", files: ["series-response-control"] },
	{
		busy: "task.busy",
		intent: "confirmation",
		files: [
			"connected-account-row",
			"fitness-results",
			"programs-screen",
			"fitness-workspace",
			"development-panel",
			"session-plan-publication",
		],
	},
	{
		busy: "busy",
		intent: "confirmation",
		files: ["feedback-delete", "event-screen"],
	},
	{
		busy: "task.busy",
		intent: "picker",
		files: [
			"development-reviewers",
			"thread-participants-header",
			"notifications-menu",
		],
	},
	{ busy: "busy", intent: "picker", files: ["lineup-position-picker"] },
	{
		busy: "task.busy",
		intent: "detail",
		files: ["moderation-screen", "thread-extras"],
	},
];

const dialogAttributes = (
	path: string,
	text: string,
): Record<string, string>[] => {
	const source = ts.createSourceFile(
		path,
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const dialogs: Record<string, string>[] = [];
	const inspect = (node: ts.Node): void => {
		if (
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
			node.tagName.getText(source) === "Dialog"
		) {
			dialogs.push(
				Object.fromEntries(
					node.attributes.properties.flatMap((property) =>
						ts.isJsxAttribute(property)
							? [
									[
										property.name.getText(source),
										property.initializer?.getText(source) ?? "true",
									],
								]
							: [],
					),
				),
			);
		}
		ts.forEachChild(node, inspect);
	};
	inspect(source);
	return dialogs;
};

test("busy product workflows expose their existing operation state to shared dismissal policy", async (): Promise<void> => {
	await Promise.all(
		policies.flatMap(({ busy, intent, files }) =>
			files.map(async (file): Promise<void> => {
				const path = `src/features/${file}.tsx`;
				const dialogs = dialogAttributes(path, await Bun.file(path).text());
				expect(
					dialogs.some(
						(attributes) =>
							attributes.isDismissDisabled === `{${busy}}` &&
							attributes.intent === `"${intent}"`,
					),
					path,
				).toBe(true);
			}),
		),
	);
});

test("message edit and delete share busy eligibility but retain distinct intent", async (): Promise<void> => {
	const path = "src/features/message-actions.tsx";
	const dialogs = dialogAttributes(path, await Bun.file(path).text());
	expect(
		dialogs.some(
			(attributes) =>
				attributes.isDismissDisabled === "{busy}" &&
				attributes.intent === '{mode === "edit" ? "form" : "confirmation"}',
		),
	).toBe(true);
});

test("reaction picker blocks every shared dismissal path during a reaction save", async (): Promise<void> => {
	const path = "src/design-system/reaction-overlay.tsx";
	const dialogs = dialogAttributes(path, await Bun.file(path).text());
	expect(dialogs.at(0)?.intent).toBe('"picker"');
	expect(dialogs.at(0)?.isDismissDisabled).toBe("{isDisabled}");
});
