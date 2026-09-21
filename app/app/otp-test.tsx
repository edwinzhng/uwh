import { type ReactElement, useState } from "react";
import {
	AuthLayout,
	Button,
	OtpInput,
	Row,
	Stack,
	Text,
} from "../src/design-system";

type Status = "idle" | "success" | "error";

const OtpTestPage = (): ReactElement => {
	const [code, setCode] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	return (
		<AuthLayout title="OTP test">
			<Stack gap="sm">
				<Text variant="small">
					Type or paste 123456 to test the success animation. Any other
					six-digit code shows the error state.
				</Text>
				<OtpInput
					label="6-digit code"
					value={code}
					onValueChange={(value): void => {
						setCode(value);
						setStatus("idle");
					}}
					onComplete={(value): void =>
						setStatus(value === "123456" ? "success" : "error")
					}
					status={status}
					autoFocus
				/>
				<Row wrap>
					<Button
						label="Check code"
						validationError={
							code.length === 6 ? undefined : "Enter all six digits"
						}
						onPress={(): void =>
							setStatus(code === "123456" ? "success" : "error")
						}
					/>
					<Button
						label="Reset"
						variant="secondary"
						onPress={(): void => {
							setCode("");
							setStatus("idle");
						}}
					/>
				</Row>
			</Stack>
		</AuthLayout>
	);
};

export default OtpTestPage;
