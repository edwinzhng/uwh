import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScreenErrorReport } from "../backend/screen-error-report";
import { RecoveryScreen } from "../design-system";

type Props = { children: ReactNode; live: boolean };
type State = { error?: Error; componentStack?: string };

export class FeedbackErrorBoundary extends Component<Props, State> {
	state: State = {};
	static getDerivedStateFromError(error: Error): State {
		return { error };
	}
	componentDidCatch(_error: Error, info: ErrorInfo): void {
		this.setState({ componentStack: info.componentStack ?? "" });
	}
	render(): ReactNode {
		const { error, componentStack } = this.state;
		if (!error) return this.props.children;
		return (
			<>
				{this.props.live && componentStack !== undefined ? (
					<ScreenErrorReport error={error} stack={componentStack} />
				) : undefined}
				<RecoveryScreen
					onRetry={(): void =>
						this.setState({ error: undefined, componentStack: undefined })
					}
				/>
			</>
		);
	}
}
