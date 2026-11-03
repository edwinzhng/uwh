import { type ReactElement, useRef, useState } from "react";
import { FlatList, View, type ViewToken } from "react-native";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { LoadingContent } from "./loading-content";
import { Stack } from "./stack";
import { geometry, space } from "./tokens";
import { useMotion } from "./use-motion";

type Props<T> = {
	items: T[];
	renderItem: (item: T) => ReactElement;
	loading: boolean;
	loadingMore: boolean;
	canLoadMore: boolean;
	onLoadMore: () => void;
	onLatestVisible: (messageId: string | undefined) => void;
};
const viewability = { itemVisiblePercentThreshold: 10, minimumViewTime: 300 };

export const MessageTimeline = <T extends { id: string }>({
	items,
	renderItem,
	loading,
	loadingMore,
	canLoadMore,
	onLoadMore,
	onLatestVisible,
}: Props<T>): ReactElement => {
	const list = useRef<FlatList<T>>(null);
	const latest = useRef({ id: items.at(0)?.id, onLatestVisible });
	latest.current = { id: items.at(0)?.id, onLatestVisible };
	const atLatest = useRef(true);
	const [away, setAway] = useState(false);
	const viewed = useRef(
		({ viewableItems }: { viewableItems: ViewToken<T>[] }): void => {
			latest.current.onLatestVisible(
				viewableItems.some(
					(entry) => entry.isViewable && entry.item.id === latest.current.id,
				)
					? latest.current.id
					: undefined,
			);
		},
	);
	const canAnimate = useMotion();
	return (
		<View
			style={{
				flex: 1,
				minHeight: 0,
				overflow: "hidden",
			}}
		>
			<FlatList
				ref={list}
				data={items}
				inverted={items.length > 0}
				keyExtractor={(item): string => item.id}
				renderItem={({ item }): ReactElement => renderItem(item)}
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingTop: items.length ? space.md : 0 }}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				initialNumToRender={12}
				maxToRenderPerBatch={12}
				windowSize={7}
				maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
				viewabilityConfig={viewability}
				onViewableItemsChanged={viewed.current}
				onScroll={(event): void => {
					const near = event.nativeEvent.contentOffset.y < geometry.tab;
					if (atLatest.current !== near) {
						atLatest.current = near;
						setAway(!near);
					}
				}}
				scrollEventThrottle={32}
				onContentSizeChange={(): void => {
					if (atLatest.current)
						list.current?.scrollToOffset({ offset: 0, animated: false });
				}}
				onEndReached={(): void => {
					if (canLoadMore && !loadingMore) onLoadMore();
				}}
				onEndReachedThreshold={0.2}
				ListEmptyComponent={
					loading ? (
						<LoadingContent />
					) : (
						<EmptyState
							title="No messages yet"
							description="Start the conversation below."
						/>
					)
				}
				ListFooterComponent={
					loadingMore ? (
						<Stack padding="sm">
							<LoadingContent />
						</Stack>
					) : undefined
				}
			/>
			{away ? (
				<View
					style={{
						position: "absolute",
						bottom: space.sm,
						alignSelf: "center",
					}}
				>
					<Button
						label="Jump to newest messages"
						icon="arrowDown"
						round
						variant="secondary"
						onPress={(): void =>
							list.current?.scrollToOffset({ offset: 0, animated: canAnimate })
						}
					/>
				</View>
			) : undefined}
		</View>
	);
};
