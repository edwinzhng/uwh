import type { ReactElement } from "react";
import { Stack, Text } from "../design-system";
import type { TermsPolicy as Policy } from "../domain/terms";

export const TermsPolicy = ({ policy }: { policy: Policy }): ReactElement => (
	<Stack gap="sm">
		<Text variant="h4">{policy.title}</Text>
		<Text variant="caption" tone="secondary">
			Version {policy.version}
		</Text>
		<Text selectable>{policy.body}</Text>
	</Stack>
);
