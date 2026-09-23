import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useMediaGrid, useMediaLightbox, useMediaReel } from "../src/index.js";

const fixtures = [
  { key: "coral", title: "Coral", color: "#e78172" },
  { key: "ocean", title: "Ocean", color: "#76b9d5" },
  { key: "forest", title: "Forest", color: "#70b991" },
];

// Consumer-owned markup and styles. Mount in an existing RN app to check on device.
export function FixtureScreen() {
  const [count, setCount] = useState(2);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [reels, setReels] = useState(false);
  const items = fixtures.slice(0, count);
  const grid = useMediaGrid({
    items, onItemSelect: (_item, index) => setSelectedIndex(index),
    hasNextPage: count < fixtures.length,
    onLoadMore: () => setCount((value) => Math.min(value + 1, fixtures.length)),
  });
  const box = useMediaLightbox({ items, selectedIndex, onSelectedIndexChange: setSelectedIndex });
  return <View style={{ flex: 1, padding: 20 }}>
    <Pressable accessibilityRole="button" onPress={() => setReels((value) => !value)}>
      <Text>{reels ? "Show grid" : "Show reels"}</Text>
    </Pressable>
    {reels ? <ReelFixture /> : <FlatList
      {...grid.getListProps()}
      renderItem={({ item, index }) => (
        <Pressable {...grid.getItemProps({ index })} style={{ flex: 1, padding: 20, backgroundColor: item.color }}>
          <Text>{item.title}</Text>
        </Pressable>
      )}
      ListFooterComponent={<Pressable {...grid.getLoadMoreProps()}><Text>Load more</Text></Pressable>}
    />}
    <Modal {...box.getModalProps()}>
      <View {...box.getContentProps()} style={{ flex: 1, padding: 24, backgroundColor: box.item?.color }}>
        <Text accessibilityRole="header">{box.item?.title}</Text>
        <Pressable {...box.getCloseProps()}><Text>Close</Text></Pressable>
        <Pressable {...box.getPreviousProps()}><Text>Previous</Text></Pressable>
        <Pressable {...box.getNextProps()}><Text>Next</Text></Pressable>
      </View>
    </Modal>
  </View>;
}

function ReelFixture() {
  const [height, setHeight] = useState(0);
  return <View style={{ flex: 1 }} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    {height > 0 && <MeasuredReels height={height} />}
  </View>;
}

function MeasuredReels({ height }) {
  const reel = useMediaReel({ items: fixtures, itemHeight: height });
  return <FlatList
    {...reel.getListProps()}
    style={{ height }}
    renderItem={({ item, index }) => (
      <View {...reel.getItemProps({ index })} style={{ height, backgroundColor: item.color, padding: 24 }}>
        <Text>{item.title}</Text>
        <Text>{reel.activeIndex === index ? "Active" : "Inactive"}</Text>
      </View>
    )}
  />;
}
