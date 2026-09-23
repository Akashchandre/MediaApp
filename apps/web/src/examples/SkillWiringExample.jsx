import { useState } from "react";
import { MediaProvider, useMediaActions, useMediaEvent, useMediaSearch } from "@headless-media/react";
import { useMediaGrid, useMediaLightbox } from "@headless-media/ui-react";

// Phase 6 skill-use rehearsal, not mounted by App until the full Phase 7 integration.
export function SkillWiringExample({ client, apiKey, query = "", onActivity }) {
  return <MediaProvider client={client} apiKey={apiKey}>
    <Gallery key={query} query={query} onActivity={onActivity} />
  </MediaProvider>;
}

function Gallery({ query, onActivity }) {
  const data = useMediaSearch({ kind: "photo", query });
  const actions = useMediaActions();
  const [selectedIndex, setSelectedIndex] = useState(null);
  useMediaEvent("view", onActivity);
  useMediaEvent("download", onActivity);

  function select(index) {
    setSelectedIndex(index);
    const item = index === null ? null : data.items[index];
    if (item) actions.trackView({ mediaId: item.id, kind: item.kind });
  }
  const grid = useMediaGrid({
    items: data.items,
    onItemSelect: (_item, index) => select(index),
    onLoadMore: data.loadMore,
    hasNextPage: data.hasNextPage,
    isLoading: data.isLoading,
    isLoadingMore: data.isLoadingMore,
  });
  const box = useMediaLightbox({
    items: data.items, selectedIndex, onSelectedIndexChange: select, label: "Photo preview",
  });

  return <section>
    <a href="https://www.pexels.com">Photos provided by Pexels</a>
    {data.isLoading && <p role="status">Loading photos...</p>}
    {data.error && <p role="alert">{data.error.message}</p>}
    {data.error && !data.items.length && <button onClick={data.retry}>Retry</button>}
    {!data.isLoading && !data.error && !data.items.length && <p>No photos found.</p>}
    <div {...grid.getContainerProps()}>
      {data.items.map((item, index) => (
        <article key={item.kind + ":" + item.id}>
          <button {...grid.getItemProps({ index })}>
            <img src={item.previewUrl} alt={item.title} />
          </button>
          <a href={item.pexelsUrl}>Photo by {item.creator.name} on Pexels</a>
        </article>
      ))}
    </div>
    {data.hasNextPage && <button {...grid.getLoadMoreProps()}>
      {data.isLoadingMore ? "Loading more..." : "Load more"}
    </button>}
    <dialog {...box.getDialogProps()}>
      <h2 {...box.getTitleProps()}>{box.item?.title}</h2>
      {box.item && <>
        <img src={box.item.sources.large} alt={box.item.title} />
        <a href={box.item.sources.original} target="_blank" rel="noreferrer" download
          onClick={() => actions.trackDownload({ mediaId: box.item.id, kind: box.item.kind })}>
          Request download
        </a>
      </>}
      <button {...box.getCloseProps()}>Close</button>
      <button {...box.getPreviousProps()}>Previous</button>
      <button {...box.getNextProps()}>Next</button>
    </dialog>
  </section>;
}
