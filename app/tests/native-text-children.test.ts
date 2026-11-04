import { expect, test } from "bun:test";
import { invalidTextChildren } from "../scripts/check-native-safety";

test("native layout rejects literal text including spaces hidden in fragments", (): void => {
	expect(
		invalidTextChildren('const face = <>{" "}<Icon />{" "}</>;', "fixture.tsx"),
	).toHaveLength(2);
	expect(
		invalidTextChildren("const face = <View>oops{0}</View>;", "fixture.tsx"),
	).toHaveLength(2);
	expect(
		invalidTextChildren(
			'const face = <View><Text>Words{" "}<>{"more"}</></Text></View>;',
			"fixture.tsx",
		),
	).toEqual([]);
});
