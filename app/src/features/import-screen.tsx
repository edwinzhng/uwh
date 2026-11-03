import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Row, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { ImportWorkspace } from "./import-workspace";
export const ImportScreen = (): ReactElement => {
	const { account } = useApp();
	const params = useLocalSearchParams<{ stage?: string }>();
	const router = useRouter();
	return (
		<ClubShell
			title="Import data"
			back={
				<Row>
					<Button
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
		>
			{account.admin ? (
				<ImportWorkspace staged={params.stage === "review"} />
			) : (
				<Text>Sign in as a club admin to import data.</Text>
			)}
		</ClubShell>
	);
};
