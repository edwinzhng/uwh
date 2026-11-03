import { type ReactElement, useId, useRef, useState } from "react";
import { Button } from "./button";
import { RichMessageEditor } from "./rich-message-editor";
import type { RichMessageEditorProps } from "./rich-message-editor-props";
import type { RichFormatRequest } from "./rich-message-model";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

export const RichTextField = (
	props: Pick<
		RichMessageEditorProps,
		| "label"
		| "value"
		| "onValueChange"
		| "placeholder"
		| "isDisabled"
		| "maxLength"
	>,
): ReactElement => {
	const id = useId();
	const sequence = useRef(0);
	const [request, setRequest] = useState<RichFormatRequest>();
	return (
		<Stack gap="xs">
			<Text variant="caption" tone="secondary">
				{props.label}
			</Text>
			<Row>
				{(
					[
						{ label: "Bold", format: "bold" },
						{ label: "Italic", format: "italic" },
						{ label: "Bullets", format: "bullet" },
					] as const
				).map(({ label, format }) => (
					<Button
						key={format}
						label={label}
						accessibilityLabel={`${props.label}: ${label}`}
						variant="ghost"
						isDisabled={props.isDisabled}
						onPress={(): void => {
							sequence.current += 1;
							setRequest({ id: `${id}:${sequence.current}`, format });
						}}
					/>
				))}
			</Row>
			<RichMessageEditor {...props} rows={5} formatRequest={request} />
		</Stack>
	);
};
