import type { ReactElement } from "react";
import { Container, Heading, Main, Text, TextLink } from "../design-system";

const NotFound = (): ReactElement => (
	<Main variant="not-found">
		<Container>
			<Text variant="eyebrow">404</Text>
			<Heading level={1}>Page not found</Heading>
			<Text>This page may have moved or no longer exists.</Text>
			<TextLink href="/" button>
				Back to home
			</TextLink>
		</Container>
	</Main>
);

export default NotFound;
