import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Button, Row } from "../design-system";

export const CoachingSessionActions = ({
	eventId,
}: {
	eventId: string;
}): ReactElement => {
	const router = useRouter();
	return (
		<Row gap="xs" wrap>
			<Button
				label="Attendance"
				variant="secondary"
				onPress={(): void =>
					router.push({
						pathname: "/session",
						params: { event: eventId, tab: "people" },
					})
				}
			/>
			<Button
				label="Session plan"
				variant="ghost"
				onPress={(): void =>
					router.push({
						pathname: "/session",
						params: { event: eventId, tab: "coaching" },
					})
				}
			/>
		</Row>
	);
};
