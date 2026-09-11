import { expect, test } from "bun:test";
import { inspectDesignBoundary } from "./check-design-boundary";

test("product UI uses the public component API", (): void => {
	expect(
		inspectDesignBoundary(
			'import { Button } from "../design-system"; const x = <Button label="Save" onPress={save} />;',
			"feature.tsx",
		),
	).toEqual([]);
});
test("blocks raw UI, styles and motion escape hatches", (): void => {
	for (const source of [
		"const x = <div />",
		'const x = <Button style={{color:"red"}} />',
		'import {motion} from "motion/react"',
		'import {LensDistortion} from "@paper-design/shaders-react"',
		"node.innerHTML = markup",
		"node.animate([])",
		"const x = <Button transitionDuration={200} />",
		'import {Button} from "../design-system/button"',
	])
		expect(inspectDesignBoundary(source, "feature.tsx").length).toBeGreaterThan(
			0,
		);
});

test("form validity cannot disable submission", (): void => {
	expect(
		inspectDesignBoundary(
			"const x = <Button isDisabled={!email.trim()} />",
			"form.tsx",
		).length,
	).toBeGreaterThan(0);
	expect(
		inspectDesignBoundary(
			"const x = <Button validationError={error} isLoading={busy} />",
			"form.tsx",
		),
	).toEqual([]);
});

test("breadcrumb typography belongs to the shared component", (): void => {
	expect(
		inspectDesignBoundary(
			"const x = <Text>Profile</Text>",
			"route-breadcrumbs.tsx",
		).length,
	).toBeGreaterThan(0);
	expect(
		inspectDesignBoundary(
			'const x = <Breadcrumbs parentLabel="Members" currentLabel="Profile" onParentPress={navigate} />',
			"route-breadcrumbs.tsx",
		),
	).toEqual([]);
	expect(
		inspectDesignBoundary("const x = <Text lineHeight={30} />", "feature.tsx")
			.length,
	).toBeGreaterThan(0);
});

test("page subtitles do not repeat role summaries", (): void => {
	for (const source of [
		"const x = <ClubShell subtitle={memberRoles(member, accounts)} />",
		'const x = <ClubShell subtitle="Player · Coach · Admin" />',
	])
		expect(inspectDesignBoundary(source, "member.tsx").length).toBeGreaterThan(
			0,
		);
	expect(
		inspectDesignBoundary(
			'const x = <ClubShell subtitle="2026–2027 season" />',
			"member.tsx",
		),
	).toEqual([]);
});

test("selection lists use shared compact spacing", (): void => {
	expect(
		inspectDesignBoundary(
			'<Stack><Checkbox label="Player" /></Stack>',
			"example.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectDesignBoundary(
			'<List><Checkbox label="Player" /></List>',
			"example.tsx",
		),
	).toHaveLength(0);
});

test("mapped row collections use List", (): void => {
	expect(
		inspectDesignBoundary(
			"<Stack>{items.map(item => <ListItem title={item.name} />)}</Stack>",
			"example.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectDesignBoundary(
			"<List>{items.map(item => <ListItem title={item.name} />)}</List>",
			"example.tsx",
		),
	).toHaveLength(0);
});
