import type { ReactElement } from "react";
import { FormattedText, Row, Stack, Surface, Text } from "../design-system";
import { planMinutes, type SessionPlanDraft } from "../domain/session-plan";
import { SessionPlanMedia } from "./session-plan-media";

export const SessionPlanDetails = ({
	plan,
}: {
	plan: Pick<SessionPlanDraft, "objective" | "drills" | "body" | "goals">;
}): ReactElement => (
	<Stack gap="sm">
		{plan.body ? (
			<Surface>
				<FormattedText>{plan.body}</FormattedText>
			</Surface>
		) : undefined}
		{plan.goals ? (
			<Surface header={<Text variant="h4">Goals / game focus</Text>}>
				<Text selectable>{plan.goals}</Text>
			</Surface>
		) : undefined}
		{plan.objective ? (
			<Surface header={<Text variant="h4">Objective</Text>}>
				<Text>{plan.objective}</Text>
			</Surface>
		) : undefined}
		{plan.drills.length ? (
			<Text variant="small" tone="secondary">
				{planMinutes(plan)} minutes · {plan.drills.length} drills
			</Text>
		) : undefined}
		{plan.drills.map((drill, index) => (
			<Surface
				key={drill.id}
				header={
					<Row justify="between" wrap>
						<Text variant="h4">
							{index + 1}. {drill.title}
						</Text>
						<Text variant="small">{drill.minutes} min</Text>
					</Row>
				}
			>
				<Stack gap="sm">
					{drill.instructions ? <Text>{drill.instructions}</Text> : undefined}
					{drill.media.map((media) => (
						<SessionPlanMedia key={media.id} media={media} />
					))}
				</Stack>
			</Surface>
		))}
	</Stack>
);
