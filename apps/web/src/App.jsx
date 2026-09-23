import { useEffect, useRef, useState } from "react";
import { MediaProvider, useMediaActions, useMediaEvent, useMediaSearch } from "@headless-media/react";
import { useMediaGrid, useMediaLightbox, useMediaReel } from "@headless-media/ui-react";

const suggestions = ["Nature", "Architecture", "Ocean", "People", "Travel"];

export function App({ client, fetch: fetcher }) {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(Boolean(client));
  return <div className="app">
    <header className="topbar">
      <a className="brand" href="./" aria-label="Frameflow home"><span aria-hidden="true">▧</span> frameflow<span className="brand-dot">.</span></a>
      <div className="topbar-right">
        <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Powered by Pexels ↗</a>
        {connected && <button className="quiet-button" onClick={() => {
          setConnected(false); setApiKey("");
        }}>Disconnect</button>}
      </div>
    </header>
    {connected ? <MediaProvider apiKey={apiKey} client={client} fetch={fetcher}>
      <Explorer />
    </MediaProvider> : <Connect onConnect={(key) => { setApiKey(key); setConnected(true); }} />}
    <footer className="footer"><span>Frameflow · A place for visual discovery</span><a href="https://www.pexels.com">Photos and videos provided by Pexels</a></footer>
  </div>;
}

function Connect({ onConnect }) {
  const [draft, setDraft] = useState("");
  return <main className="connect-layout">
    <section className="welcome">
      <p className="eyebrow">A fresh perspective</p>
      <h1>Find your next<br /><em>inspiration.</em></h1>
      <p className="intro">Extraordinary photographs. Stories in motion.<br />Explore a world worth looking closer at.</p>
      <div className="visual-study" aria-hidden="true">
        <div className="study-card study-one"><span>01 / EXPLORE</span></div>
        <div className="study-card study-two"><span>02 / DISCOVER</span></div>
        <div className="study-card study-three"><span>03 / CREATE</span></div>
      </div>
    </section>
    <section className="connect-card" aria-labelledby="connect-title">
      <span className="connection-icon" aria-hidden="true">↗</span>
      <p className="eyebrow">Your window to Pexels</p>
      <h2 id="connect-title">Let’s take a look.</h2>
      <p>Connect with your free Pexels API key to explore photos and videos.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim()) { onConnect(draft.trim()); setDraft(""); }
      }}>
        <label htmlFor="api-key">Pexels API key</label>
        <input id="api-key" type="password" autoComplete="off" spellCheck={false}
          placeholder="Paste your API key" value={draft} onChange={(event) => setDraft(event.target.value)} required />
        <button className="primary-button" disabled={!draft.trim()}>Start exploring <span aria-hidden="true">→</span></button>
      </form>
      <p className="key-note">Kept in memory for this session only. Your browser can see the key in API requests.</p>
      <a className="text-link" href="https://www.pexels.com/api/" target="_blank" rel="noreferrer">Get a free Pexels API key ↗</a>
    </section>
  </main>;
}

function Explorer() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("photo");
  const [activity, setActivity] = useState([]);
  function record(event) { setActivity((events) => [event, ...events].slice(0, 20)); }
  useMediaEvent("view", record);
  useMediaEvent("download", record);
  function search(value) { setQuery(value.trim()); setDraft(value); }

  return <main className="explorer">
    <section className="explore-heading">
      <div><p className="eyebrow">The world, in a different light</p><h1>A little inspiration.<br /><em>Endless possibilities.</em></h1></div>
      <p>A collection of moments<br />waiting to become your next idea.</p>
    </section>
    <form className="search-form" role="search" onSubmit={(event) => { event.preventDefault(); search(draft); }}>
      <span aria-hidden="true">⌕</span>
      <label className="sr-only" htmlFor="media-search">Search photos and videos</label>
      <input id="media-search" value={draft} onChange={(event) => setDraft(event.target.value)}
        placeholder="What inspires you today?" type="search" />
      <button className="primary-button">Search <span aria-hidden="true">→</span></button>
    </form>
    <div className="suggestions"><span>Try something new</span>{suggestions.map((term) =>
      <button key={term} onClick={() => search(term)}>{term} <span aria-hidden="true">↗</span></button>)}
    </div>
    <div className="browse-bar">
      <div className="kind-controls" role="group" aria-label="Media type">
        <button aria-pressed={kind === "photo"} onClick={() => setKind("photo")}>▧ Photos</button>
        <button aria-pressed={kind === "video"} onClick={() => setKind("video")}>▷ Videos</button>
      </div>
      <details className="activity">
        <summary>Session activity <span>{activity.length}</span></summary>
        <div className="activity-panel">
          <h2>Recent activity</h2>
          <p>Last 20 view and download requests. Downloads are requests, not confirmed saves.</p>
          {activity.length ? <ol>{activity.map((event, index) => <li key={index}>
            <span>{event.type === "view" ? "Viewed" : "Download requested"}</span>
            <span>{event.kind} #{event.mediaId}</span>
          </li>)}</ol> : <p>Open a photo or explore a reel to get started.</p>}
        </div>
      </details>
    </div>
    <Results key={JSON.stringify([kind, query])} kind={kind} query={query} onClear={() => search("")} />
  </main>;
}

function Results({ kind, query, onClear }) {
  const data = useMediaSearch({ kind, query, perPage: 18 });
  const title = query ? `Results for “${query}”` : kind === "photo" ? "Curated for your curiosity" : "Stories in motion";
  return <section aria-label="Search results">
    <div className="results-heading"><h2>{title}</h2><div>
      <span>{data.items.length} {kind === "photo" ? "photos" : "videos"}</span>
      {query && <button className="text-button" onClick={onClear}>Clear search</button>}
    </div></div>
    {data.isLoading && <div className="loading-state" role="status"><span className="spinner" />Finding your next inspiration…</div>}
    {data.error && <div className="error-state" role="alert">
      <h3>{data.items.length ? "Couldn’t load the next page" : "Couldn’t load media"}</h3>
      <p>{data.error.message}</p>
      {data.error.code === "AUTHENTICATION_ERROR" && <p>Use Disconnect above to enter a different Pexels key.</p>}
      <button className="quiet-button" disabled={data.isLoadingMore}
        onClick={data.items.length ? data.loadMore : data.retry}>Try again</button>
    </div>}
    {!data.isLoading && !data.error && !data.items.length && <div className="empty-state">
      <span aria-hidden="true">⌕</span><h3>No results this time.</h3><p>Try a broader search or discover something new.</p>
      {query && <button className="quiet-button" onClick={onClear}>Browse featured media</button>}
    </div>}
    {kind === "photo" ? <PhotoGallery data={data} /> : <>
      {!!data.items.length && <VideoReels items={data.items} />}
      <LoadMore data={data} />
    </>}
  </section>;
}

function PhotoGallery({ data }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { trackView } = useMediaActions();
  function select(index) {
    setSelectedIndex(index);
    const item = index === null ? null : data.items[index];
    if (item) trackView({ mediaId: item.id, kind: item.kind });
  }
  const grid = useMediaGrid({
    items: data.items, onItemSelect: (_item, index) => select(index), onLoadMore: data.loadMore,
    hasNextPage: data.hasNextPage, isLoading: data.isLoading, isLoadingMore: data.isLoadingMore,
  });
  const box = useMediaLightbox({ items: data.items, selectedIndex, onSelectedIndexChange: select, label: "Photo preview" });
  return <>
    <div {...grid.getContainerProps({ className: "photo-grid" })}>
      {data.items.map((item, index) => <article className="photo-card" key={item.kind + ":" + item.id}>
        <button {...grid.getItemProps({ index, className: "photo-open", "aria-label": `Open ${item.title}` })}>
          <MediaImage src={item.sources.medium} alt={item.title} />
          <span className="expand-hint" aria-hidden="true">↗</span>
        </button>
        <div className="photo-caption"><Credit item={item} /><span>{String(index + 1).padStart(2, "0")}</span></div>
      </article>)}
    </div>
    {data.hasNextPage && <div className="load-more"><button {...grid.getLoadMoreProps({ className: "quiet-button" })}>
      {data.isLoadingMore ? "Loading more…" : "Discover more photos"} <span aria-hidden="true">↓</span>
    </button></div>}
    <dialog {...box.getDialogProps({ className: "lightbox" })}>
      <div className="lightbox-heading"><h2 {...box.getTitleProps()}>{box.item?.title}</h2>
        <button {...box.getCloseProps({ className: "icon-button" })}>✕</button></div>
      {box.item && <div className="lightbox-media"><MediaImage key={box.item.id} src={box.item.sources.large} alt={box.item.title} /></div>}
      <div className="lightbox-bottom">
        {box.item && <Credit item={box.item} />}
        <div className="lightbox-actions">
          <button {...box.getPreviousProps({ className: "icon-button" })}>←</button>
          <span>{box.isOpen ? selectedIndex + 1 : 0} / {data.items.length}</span>
          <button {...box.getNextProps({ className: "icon-button" })}>→</button>
          {box.item && <DownloadLink item={box.item} url={box.item.sources.original} />}
        </div>
      </div>
      <p className="download-note">Original files may open in a new tab. A download request does not confirm a saved file.</p>
    </dialog>
  </>;
}

function LoadMore({ data }) {
  const grid = useMediaGrid({
    items: data.items, onLoadMore: data.loadMore, hasNextPage: data.hasNextPage,
    isLoading: data.isLoading, isLoadingMore: data.isLoadingMore,
  });
  return data.hasNextPage && <div className="load-more"><button {...grid.getLoadMoreProps({ className: "quiet-button" })}>
    {data.isLoadingMore ? "Loading more…" : "Discover more videos"} ↓
  </button></div>;
}

function VideoReels({ items }) {
  const { trackView } = useMediaActions();
  const lastViewed = useRef(null);
  const reel = useMediaReel({ items, onActiveItemChange: (item) => {
    const identity = item.kind + ":" + item.id;
    if (lastViewed.current === identity) return;
    lastViewed.current = identity;
    trackView({ mediaId: item.id, kind: item.kind });
  } });
  return <div className="reel-layout">
    <div className="reel-description"><p className="eyebrow">Press play on possibility</p><h3>A moment.<br />A whole story.</h3>
      <p>Scroll to explore. Use the up and down arrow keys when the reel is focused.</p>
      <p className="reel-count">{reel.activeIndex + 1} <span>/ {items.length}</span></p>
      <div className="reel-navigation">
        <button className="icon-button" aria-label="Previous video" disabled={reel.activeIndex <= 0} onClick={() => reel.goTo(reel.activeIndex - 1)}>↑</button>
        <button className="icon-button" aria-label="Next video" disabled={reel.activeIndex >= items.length - 1} onClick={() => reel.goTo(reel.activeIndex + 1)}>↓</button>
      </div>
    </div>
    <div {...reel.getContainerProps({ className: "reels" })}>
      {items.map((item, index) => <section key={item.kind + ":" + item.id} {...reel.getItemProps({ index, className: "reel" })}>
        <VideoCard item={item} active={index === reel.activeIndex} />
      </section>)}
    </div>
  </div>;
}

export function VideoCard({ item, active }) {
  const videoRef = useRef(null);
  const [notice, setNotice] = useState("");
  const source = item.sources.find((file) => file.mimeType === "video/mp4" && file.quality === "sd")
    ?? item.sources.find((file) => file.mimeType === "video/mp4");
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return undefined;
    let current = true;
    if (active) {
      Promise.resolve(video.play()).catch(() => {
        if (current) setNotice("Autoplay is unavailable. Use the video controls to play.");
      });
    } else video.pause();
    return () => { current = false; video.pause(); };
  }, [active, source]);
  return <div className="video-card">
    {source ? <video ref={videoRef} src={source.url} poster={item.previewUrl} controls playsInline muted loop
      preload={active ? "metadata" : "none"} aria-label={item.title}
      onPlay={() => {
        if (!active) { videoRef.current?.pause(); return; }
        setNotice("");
      }}
      onError={() => setNotice("This video couldn’t be loaded. Try another video or open it on Pexels.")} />
      : <div className="video-unavailable"><MediaImage src={item.previewUrl} alt={item.title} /><p>No playable MP4 is available.</p></div>}
    {notice && <p className="video-notice" role="status">{notice}</p>}
    <div className="video-caption"><div><Credit item={item} /><p>{item.duration}s · {item.width} × {item.height}</p></div>
      {source && <DownloadLink item={item} url={source.url} />}</div>
  </div>;
}

function MediaImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="image-fallback" role="img" aria-label={alt}>Image unavailable</span>
    : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function Credit({ item }) {
  return <a className="credit" href={item.pexelsUrl} target="_blank" rel="noreferrer">By {item.creator.name} <span aria-hidden="true">↗</span></a>;
}

function DownloadLink({ item, url }) {
  const { trackDownload } = useMediaActions();
  return <a className="download-link" href={url} download target="_blank" rel="noreferrer"
    onClick={() => trackDownload({ mediaId: item.id, kind: item.kind })}>{item.kind === "photo" ? "Download original" : "Download video"} <span aria-hidden="true">↗</span></a>;
}
