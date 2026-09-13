import type { ReactElement } from "react";
import {
	DocumentList,
	Heading,
	Section,
	Text,
	TextLink,
} from "../design-system";
export const Policies = ({
	documents,
	email,
}: {
	documents: { title: string; url: string; category: string }[];
	email: string;
}): ReactElement => (
	<Section id="policies" variant="policies" labelledBy="policies-title">
		<Heading id="policies-title">Policies</Heading>
		<Text variant="intro">
			We are committed to providing a safe, respectful environment for all
			athletes, parents, coaches, and volunteers.
		</Text>
		{documents.length ? (
			<DocumentList documents={documents} />
		) : (
			<Text>
				Need a policy?{" "}
				<TextLink href={`mailto:${email}`}>Request a copy</TextLink>.
			</Text>
		)}
	</Section>
);
