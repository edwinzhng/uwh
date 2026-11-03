import type { ReactElement } from "react";
import { Badge, List, Row, Stack, Text } from "../design-system";
import type { MemberMergePreview } from "../domain/member-merge";

export const MemberMergeSummary = ({
	preview,
}: {
	preview: MemberMergePreview;
}): ReactElement => (
	<Stack>
		<Text variant="label">
			{preview.source.name} → {preview.target.name}
		</Text>
		<Text variant="small" tone="secondary">
			The active member’s name, current goal and coaching details stay
			unchanged. Program memberships combine. No login, role or permission is
			created. The archived source remains an alias with an audit.
		</Text>
		<List>
			{preview.counts.map((row) => (
				<Row key={row.label} justify="between" wrap>
					<Text variant="small">{row.label}</Text>
					<Badge label={String(row.count)} />
				</Row>
			))}
		</List>
		{preview.filledFields.length ? (
			<Text variant="small">
				Fill empty fields: {preview.filledFields.join(", ")}.
			</Text>
		) : undefined}
		{preview.conflicts.length ? (
			<Stack>
				<Text variant="label" tone="danger">
					Resolve {preview.conflicts.length} conflict
					{preview.conflicts.length === 1 ? "" : "s"}
				</Text>
				<List>
					{preview.conflicts.map((conflict) => (
						<Stack
							key={`${conflict.category}:${conflict.record}:${conflict.reason}`}
							gap="xs"
						>
							<Text variant="label">
								{conflict.category} · {conflict.record}
							</Text>
							<Text variant="small">{conflict.reason}</Text>
							<Text variant="small" tone="secondary">
								{conflict.resolution}
							</Text>
						</Stack>
					))}
				</List>
			</Stack>
		) : (
			<Badge kind="success" label="No conflicts found" />
		)}
	</Stack>
);
