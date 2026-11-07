import { useMutation, useQuery } from "convex/react";
import { atom, useAtom } from "jotai";
import { type ReactElement, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Button,
	Checkbox,
	Dialog,
	HomeCardFrame,
	type HomeCardFramePosition,
	List,
	Row,
	Stack,
	Text,
	TextLink,
	usePageLoading,
} from "../design-system";
import {
	availableHomeCards,
	type HomeCardId,
	type HomeLayout,
	type HomeWorkspace,
	homeCards,
	resolveHomeLayout,
} from "../domain/home-layout";
import { homeNextPractice, homePendingResponse } from "../domain/home-summary";
import { CoachTools } from "./coach-dashboard";
import { CoachHomeCards } from "./coach-home-cards";
import { CoachingHomeTasks } from "./coaching-home-tasks";
import { HomeAnnouncement } from "./home-announcement";
import { HomeAttendance } from "./home-attendance";
import { HomeFitness } from "./home-fitness";
import { HomeHighlights } from "./home-highlights";
import { HomeMessages } from "./home-messages";
import { HomePractice } from "./home-practice";
import { useFormTask } from "./use-form-task";

const previewLayouts = atom<Record<string, HomeLayout>>({});
const cardIds = (ids: string[]): HomeCardId[] =>
	ids.flatMap((id) => {
		const card = homeCards.find((entry) => entry.id === id);
		return card ? [card.id] : [];
	});
const AddCards = ({
	hidden,
	onAdd,
	onClose,
}: {
	hidden: HomeCardId[];
	onAdd: (id: HomeCardId) => void;
	onClose: () => void;
}): ReactElement => (
	<Dialog
		title="Add cards"
		isOpen
		onOpenChange={(open): void => {
			if (!open) onClose();
		}}
	>
		<List>
			{hidden.length ? (
				hidden.map((id) => (
					<Checkbox
						key={id}
						label={homeCards.find((card) => card.id === id)?.label ?? id}
						checked={false}
						onChange={(): void => onAdd(id)}
					/>
				))
			) : (
				<Text variant="small" tone="secondary">
					All available cards are on your home page.
				</Text>
			)}
		</List>
	</Dialog>
);
const Dashboard = ({
	now,
	view,
	saved,
	loading,
	save,
}: {
	now: number;
	view: HomeWorkspace;
	saved?: HomeLayout;
	loading?: boolean;
	save: (value: HomeLayout) => Promise<void>;
}): ReactElement => {
	const { data, account } = useApp();
	const [draft, setDraft] = useState<HomeLayout>();
	const [adding, setAdding] = useState(false);
	const positions = useRef<Partial<Record<HomeCardId, HomeCardFramePosition>>>(
		{},
	);
	const task = useFormTask();
	const layout = resolveHomeLayout(availableHomeCards(account, view), saved);
	const practice = homeNextPractice(data, account, now);
	const pending = homePendingResponse(data, account, now);
	const renderCard = (id: HomeCardId): ReactElement => {
		switch (id) {
			case "practice":
				return (
					<HomePractice event={practice} responseNeeded={Boolean(pending)} />
				);
			case "announcement":
				return <HomeAnnouncement />;
			case "shoutouts":
				return <HomeHighlights />;
			case "season":
				return <HomeAttendance now={now} />;
			case "fitness":
				return <HomeFitness />;
			case "messages":
				return <HomeMessages />;
			case "club_stats":
			case "practice_progress":
			case "next_coaching":
				return <CoachHomeCards now={now} card={id} />;
			case "coach_tasks":
				return <CoachingHomeTasks />;
			case "coach_tools":
				return <CoachTools />;
		}
	};
	const visible = (draft ?? layout).order.filter(
		(id) => !(draft ?? layout).hidden.includes(id),
	);
	const begin = (): void => {
		if (!loading) setDraft(layout);
	};
	const moveTo = (id: HomeCardId, targetId: HomeCardId): void =>
		setDraft((current) => {
			if (!current || id === targetId) return current;
			const target = current.order.indexOf(targetId);
			const order = current.order.filter((entry) => entry !== id);
			order.splice(target, 0, id);
			return { ...current, order };
		});
	const finish = async (): Promise<void> => {
		if (
			draft &&
			(await task.submit(
				() => undefined,
				() => save(draft),
			))
		)
			setDraft(undefined);
	};
	return (
		<Stack gap="xs">
			<Row justify="end" gap="xs">
				{draft ? (
					<>
						<TextLink
							label="Cancel"
							role="button"
							isDisabled={task.busy}
							onPress={(): void => {
								setDraft(undefined);
								task.clear();
							}}
						/>
						<TextLink
							label="Add cards"
							role="button"
							isDisabled={task.busy}
							onPress={(): void => setAdding(true)}
						/>
						<Button
							label="Done"
							isLoading={task.busy}
							onPress={(): void => {
								void finish();
							}}
						/>
					</>
				) : (
					<TextLink
						label="Edit home"
						role="button"
						compact
						isDisabled={loading}
						onPress={begin}
					/>
				)}
			</Row>
			{draft ? (
				<Text variant="small" tone="secondary">
					Drag cards to rearrange them. Tap − to remove a card.
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			{loading ? (
				<Text variant="small" tone="secondary">
					Loading home…
				</Text>
			) : (
				<Stack gap="sm">
					{visible.map((id, index) => (
						<HomeCardFrame
							key={id}
							position={index + 1}
							total={visible.length}
							label={homeCards.find((card) => card.id === id)?.label ?? id}
							editing={Boolean(draft)}
							canMoveUp={index > 0}
							canMoveDown={index < visible.length - 1}
							onEdit={begin}
							onRemove={(): void =>
								setDraft((current) =>
									current
										? { ...current, hidden: [...current.hidden, id] }
										: current,
								)
							}
							onMove={(direction): void => {
								const target = visible.at(index + direction);
								if (target) moveTo(id, target);
							}}
							onPosition={(position): void => {
								positions.current[id] = position;
							}}
							onDragEnd={(distance): void => {
								const from = positions.current[id];
								if (!from || Math.abs(distance) < 8) return;
								const destination = from.y + from.height / 2 + distance;
								const target = visible.reduce<HomeCardId>(
									(closest, candidate) => {
										const a = positions.current[closest];
										const b = positions.current[candidate];
										return b &&
											(!a ||
												Math.abs(b.y + b.height / 2 - destination) <
													Math.abs(a.y + a.height / 2 - destination))
											? candidate
											: closest;
									},
									id,
								);
								moveTo(id, target);
							}}
						>
							{renderCard(id)}
						</HomeCardFrame>
					))}
				</Stack>
			)}
			{draft && visible.length === 0 ? (
				<Text variant="small" tone="secondary">
					No cards shown. Choose Add cards to restore them.
				</Text>
			) : undefined}
			{adding && draft ? (
				<AddCards
					hidden={draft.hidden}
					onAdd={(id): void =>
						setDraft((current) =>
							current
								? {
										...current,
										hidden: current.hidden.filter((entry) => entry !== id),
									}
								: current,
						)
					}
					onClose={(): void => setAdding(false)}
				/>
			) : undefined}
		</Stack>
	);
};
const LiveDashboard = ({
	now,
	view,
}: {
	now: number;
	view: HomeWorkspace;
}): ReactElement => {
	const value = useQuery(api.home_layout.read, { view });
	usePageLoading(value === undefined);
	const save = useMutation(api.home_layout.save);
	const saved = value
		? {
				order: cardIds(value.order),
				hidden: cardIds(value.hidden),
				revision: value.revision,
			}
		: undefined;
	return (
		<Dashboard
			now={now}
			view={view}
			saved={saved}
			loading={value === undefined}
			save={async (layout): Promise<void> => {
				await save({ ...layout, view });
			}}
		/>
	);
};
const PreviewDashboard = ({
	now,
	view,
}: {
	now: number;
	view: HomeWorkspace;
}): ReactElement => {
	const { account } = useApp();
	const [layouts, setLayouts] = useAtom(previewLayouts);
	const key = `${account.id}:${view}`;
	return (
		<Dashboard
			now={now}
			view={view}
			saved={layouts[key]}
			save={async (layout): Promise<void> => {
				setLayouts((current) => ({
					...current,
					[key]: { ...layout, revision: layout.revision + 1 },
				}));
			}}
		/>
	);
};
export const HomeDashboard = ({
	now,
	view,
}: {
	now: number;
	view: HomeWorkspace;
}): ReactElement => {
	const { source } = useApp();
	return source === "convex" ? (
		<LiveDashboard key={view} now={now} view={view} />
	) : (
		<PreviewDashboard key={view} now={now} view={view} />
	);
};
