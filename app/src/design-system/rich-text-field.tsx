import {
	type ReactElement,
	type ReactNode,
	useId,
	useRef,
	useState,
} from "react";
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
		| "rows"
		| "onFocus"
		| "label"
		| "value"
		| "onValueChange"
		| "placeholder"
		| "isDisabled"
		| "maxLength"
	> & { toolbarAction?: ReactNode },
): ReactElement => {
	const id = useId();
	const sequence = useRef(0);
	const [request, setRequest] = useState<RichFormatRequest>();
	const { toolbarAction, ...editorProps } = props;
	return (
		<Stack gap="xs">
			<Text variant="caption" tone="secondary">
				{props.label}
			</Text>
			<Row>
				{(
					[
						{ label: "Bold", format: "bold", icon: "bold" },
						{ label: "Italic", format: "italic", icon: "italic" },
						{ label: "Bullets", format: "bullet", icon: "list" },
					] as const
				).map(({ label, format, icon }) => (
					<Button
						key={format}
						label={label}
						icon={icon}
						compact
						accessibilityLabel={`${props.label}: ${label}`}
						variant="ghost"
						isDisabled={props.isDisabled}
						onPress={(): void => {
							sequence.current += 1;
							setRequest({ id: `${id}:${sequence.current}`, format });
						}}
					/>
				))}
				{toolbarAction}
			</Row>
			<RichMessageEditor
				{...editorProps}
				rows={props.rows ?? 5}
				formatRequest={request}
			/>
		</Stack>
	);
};
