import type { ReactElement } from "react";
import { Checkbox } from "./checkbox";
import { ColorReference } from "./color-reference";
import { EmptyState } from "./empty-state";
import { Grid } from "./grid";
import { List } from "./list";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import { TokenSamples } from "./token-samples";

export const FoundationReference = (): ReactElement => (
	<Stack gap="lg">
		<ColorReference />
		<Stack>
			<Text variant="h4">Typography</Text>
			<Text variant="small" tone="secondary">
				Page headers use a title and optional useful context, never a repeated
				Player · Coach · Admin role subtitle. Show role badges on restricted
				tabs or actions instead.
			</Text>
			<Text variant="small" tone="secondary">
				Use 28px for page titles, 16px for card and section headings, 14px for
				content and row labels, and 12px for metadata. Reserve 24px for summary
				numbers; use the same scale on mobile and desktop.
			</Text>
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
		<Stack gap="sm">
			<Text variant="h4">Lists and empty states</Text>
			<Text variant="small" tone="secondary">
				Use List for compact collections. Rows keep their touch targets without
				extra gaps. Put primary actions in the page header and use tabs for
				views.
			</Text>
			<List>
				<Checkbox label="Selected player" checked onChange={(): void => {}} />
				<Checkbox
					label="Another player"
					checked={false}
					onChange={(): void => {}}
				/>
			</List>
			<EmptyState
				title="No fitness tests yet"
				description="Create a test to start recording results and tracking progress."
			/>
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
