import { expect, test } from "bun:test";
import { inspectDesignBoundary } from "../scripts/check-design-boundary";

test("product code cannot bypass design-system primitives", (): void => {
	for (const source of [
		"const X=()=> <div/>",
		'const X=()=> <Text style={{color:"red"}}/>',
		"const X=()=> <Text {...props}/>",
		'import Link from "next/link"',
		'import {Button} from "../design-system/controls"',
		'const Box="div"; const X=()=> <Box/>',
		'React.createElement("div")',
		'document.createElement("div")',
		"node.innerHTML=value",
		'import "./extra.css"',
	])
		expect(inspectDesignBoundary(source, "example.tsx").length).toBeGreaterThan(
			0,
		);
	expect(
		inspectDesignBoundary(
			'import {Text,Button} from "../design-system"; const X=()=> <Text><Button variant="primary">Save</Button></Text>',
			"example.tsx",
		),
	).toEqual([]);
});
