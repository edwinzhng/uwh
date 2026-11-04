import { type ReactElement, type ReactNode, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	View,
	type ViewToken,
} from "react-native";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { LoadingContent } from "./loading-content";
import { Stack } from "./stack";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";
import { ToolbarGroup } from "./toolbar-group";
import { useMotion } from "./use-motion";

type Props<T> = {
	items: T[];
	topOverlay?: ReactNode;
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
	topOverlay,
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
	const [overlayHeight, setOverlayHeight] = useState(0);
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
	const theme = useTheme();
	return (
		<View
			style={{
				flex: 1,
				minHeight: 0,
				overflow: "hidden",
			}}
		>
			{topOverlay ? (
				<View
					pointerEvents="box-none"
					onLayout={({ nativeEvent }): void =>
						setOverlayHeight(nativeEvent.layout.height)
					}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						zIndex: layer.sticky,
						padding: space.md,
						paddingTop: space.xs,
						gap: space.xs,
					}}
				>
					{topOverlay}
				</View>
			) : undefined}
			<FlatList
				ref={list}
				contentInsetAdjustmentBehavior="never"
				automaticallyAdjustContentInsets={false}
				data={items}
				inverted={items.length > 0}
				keyExtractor={(item): string => item.id}
				renderItem={({ item }): ReactElement => renderItem(item)}
				style={{ flex: 1 }}
				contentContainerStyle={{
					paddingTop: items.length ? space.md : topOverlay ? overlayHeight : 0,
					paddingBottom: items.length && topOverlay ? overlayHeight : 0,
				}}
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
							<ActivityIndicator
								accessibilityLabel="Loading earlier messages"
								color={theme.text.secondary}
								animating={canAnimate}
								hidesWhenStopped={false}
							/>
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
					<ToolbarGroup label="Message navigation">
						<Button
							label="Jump to newest messages"
							icon="arrowDown"
							round
							variant="ghost"
							onPress={(): void =>
								list.current?.scrollToOffset({
									offset: 0,
									animated: canAnimate,
								})
							}
						/>
					</ToolbarGroup>
				</View>
			) : undefined}
		</View>
	);
};
