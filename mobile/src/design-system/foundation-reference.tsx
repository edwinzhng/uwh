import type { ReactElement } from "react";
import { ColorReference } from "./color-reference";
import { Grid } from "./grid";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import { TokenSamples } from "./token-samples";

export const FoundationReference = (): ReactElement => (
	<Stack gap="lg">
		<ColorReference />
		<Stack>
			<Text variant="h4">Typography</Text>
			<Text variant="h1">Heading 1</Text>
			<Text variant="h2">Heading 2</Text>
			<Text variant="h3">Heading 3</Text>
			<Text variant="h4">Heading 4</Text>
			<Text>Body</Text>
			<Text variant="label">Label</Text>
			<Text variant="caption" tone="secondary">
				Caption
			</Text>
		</Stack>
		<TokenSamples />
		<Stack>
			<Text variant="h4">Elevation</Text>
			<Grid gap="sm">
				<Surface elevation="none">
					<Text variant="small">None</Text>
				</Surface>
				<Surface elevation="raised">
					<Text variant="small">Raised</Text>
				</Surface>
				<Surface elevation="floating">
					<Text variant="small">Floating</Text>
				</Surface>
				<Surface elevation="overlay">
					<Text variant="small">Overlay</Text>
				</Surface>
			</Grid>
		</Stack>
	</Stack>
);
