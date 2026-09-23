// @vitest-environment jsdom
import { createRef, useState } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaGrid, useMediaLightbox, useMediaReel } from "../src/index.js";

// Deliberately unrelated to SDK models: UI behavior accepts any local data.
const fixtures = [{ name: "Red" }, { name: "Blue" }, { name: "Green" }];
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("grid", () => {
  it("selects generic data and composes cancellable consumer handlers", () => {
    const select = vi.fn();
    const consumer = vi.fn((event) => event.preventDefault());
    const { result } = renderHook(() => useMediaGrid({ items: fixtures, onItemSelect: select }));
    const view = render(<button {...result.current.getItemProps({ index: 1, onClick: consumer })}>Pick</button>);
    fireEvent.click(screen.getByText("Pick"));
    expect(consumer).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    view.rerender(<button {...result.current.getItemProps({ index: 1 })}>Pick</button>);
    fireEvent.click(screen.getByText("Pick"));
    expect(select).toHaveBeenCalledWith(fixtures[1], 1);
  });

  it("guards pagination while pending, releases failures, and stops at the last page", async () => {
    let resolve;
    const pending = new Promise((done) => { resolve = done; });
    const load = vi.fn().mockReturnValueOnce(pending).mockRejectedValueOnce(new Error("offline"));
    const { result, rerender } = renderHook(
      ({ hasNextPage }) => useMediaGrid({ items: fixtures, hasNextPage, onLoadMore: load }),
      { initialProps: { hasNextPage: true } },
    );
    const first = result.current.getLoadMoreProps().onClick();
    await result.current.getLoadMoreProps().onClick();
    expect(load).toHaveBeenCalledOnce();
    resolve();
    await first;
    await expect(result.current.getLoadMoreProps().onClick()).rejects.toThrow("offline");
    await result.current.getLoadMoreProps().onClick();
    expect(load).toHaveBeenCalledTimes(3);
    rerender({ hasNextPage: false });
    expect(result.current.getLoadMoreProps().disabled).toBe(true);
    await result.current.getLoadMoreProps().onClick();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("exposes loading accessibility state and disables loading controls", () => {
    const { result } = renderHook(() => useMediaGrid({
      items: fixtures, hasNextPage: true, isLoadingMore: true, onLoadMore: vi.fn(),
    }));
    expect(result.current.getContainerProps()["aria-busy"]).toBe(true);
    expect(result.current.getLoadMoreProps().disabled).toBe(true);
    expect(result.current.getItemProps({ index: 99 }).disabled).toBe(true);
  });
});

// jsdom has no layout or browser top layer; emulate only the missing native methods.
describe("lightbox", () => {
  beforeEach(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: vi.fn(function () { this.setAttribute("open", ""); }) },
      close: { configurable: true, value: vi.fn(function () { this.removeAttribute("open"); }) },
    });
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function () {
      return this.hidden ? [] : [{ width: 100, height: 30 }];
    });
  });
  afterEach(() => {
    cleanup();
    delete HTMLDialogElement.prototype.showModal;
    delete HTMLDialogElement.prototype.close;
  });

  function Lightbox({ items = fixtures, externalRef, onKeyDown, controls = true }) {
    const [selectedIndex, setSelectedIndex] = useState(null);
    const box = useMediaLightbox({ items, selectedIndex, onSelectedIndexChange: setSelectedIndex });
    return <>
      <button onClick={() => setSelectedIndex(0)}>Open</button>
      <dialog {...box.getDialogProps({ ref: externalRef, onKeyDown })}>
        <h2 {...box.getTitleProps()}>{box.item?.name}</h2>
        {controls && <>
          <button {...box.getCloseProps()}>Close</button>
          <button {...box.getPreviousProps()}>Previous</button>
          <button {...box.getNextProps()}>Next</button>
          <input aria-label="Caption" />
          <button hidden>Hidden</button>
        </>}
      </dialog>
    </>;
  }

  function open() {
    const trigger = screen.getByText("Open");
    trigger.focus();
    fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole("dialog") };
  }

  it("opens a labelled modal, navigates without refocusing, and restores focus on Escape", () => {
    const ref = createRef();
    render(<Lightbox externalRef={ref} />);
    const { trigger, dialog } = open();
    expect(ref.current).toBe(dialog);
    expect(dialog.getAttribute("aria-label")).toBe("Media preview");
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByText("Previous").disabled).toBe(true);
    const next = screen.getByText("Next");
    next.focus();
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(screen.getByRole("heading").textContent).toBe("Blue");
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(screen.getByRole("heading").textContent).toBe("Red");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("wraps Tab and Shift+Tab within visible enabled controls", () => {
    render(<Lightbox />);
    const { dialog } = open();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("Close"));
    fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText("Caption"));
    fireEvent.keyDown(document.activeElement, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("Close"));
  });

  it("retains focus when there are no tabbable controls", () => {
    render(<Lightbox controls={false} />);
    const { dialog } = open();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(dialog);
  });

  it("does not intercept editing keys, supports native cancel, and honors preventDefault", () => {
    const view = render(<Lightbox />);
    let { dialog } = open();
    fireEvent.keyDown(screen.getByLabelText("Caption"), { key: "ArrowRight" });
    expect(screen.getByRole("heading").textContent).toBe("Red");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(dialog.open).toBe(false);
    view.rerender(<Lightbox onKeyDown={(event) => event.preventDefault()} />);
    ({ dialog } = open());
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(true);
    fireEvent.click(screen.getByText("Close"));
    expect(dialog.open).toBe(false);
  });

  it("closes and restores focus if selected data disappears or the component unmounts", () => {
    const view = render(<Lightbox />);
    const { trigger, dialog } = open();
    view.rerender(<Lightbox items={[]} />);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    view.rerender(<Lightbox />);
    open();
    view.unmount();
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(2);
  });
});

describe("reels", () => {
  let observer;
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
  });

  function Reels({ items = fixtures, onChange, externalRef }) {
    const reel = useMediaReel({ items, onActiveItemChange: onChange });
    return <div {...reel.getContainerProps({ ref: externalRef })}>
      {items.map((item, index) => <section key={item.name} {...reel.getItemProps({ index })}>
        <button>{item.name}</button>
      </section>)}
      <output>{reel.activeIndex}</output>
    </div>;
  }

  function geometry() {
    const container = screen.getByRole("region");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 500 });
    container.scrollTo = vi.fn(({ top }) => { container.scrollTop = top; });
    return container;
  }

  it("detects scrolling, emits once per active item, composes refs, and disconnects", () => {
    const change = vi.fn();
    const ref = createRef();
    const view = render(<Reels onChange={change} externalRef={ref} />);
    const container = geometry();
    expect(ref.current).toBe(container);
    expect(change).toHaveBeenLastCalledWith(fixtures[0], 0);
    fireEvent.scroll(container, { target: { scrollTop: 550 } });
    expect(change).toHaveBeenLastCalledWith(fixtures[1], 1);
    fireEvent.scroll(container, { target: { scrollTop: 560 } });
    expect(change).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("group", { name: "Item 2 of 3" }).getAttribute("aria-current")).toBe("true");
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(ref.current).toBeNull();
  });

  it("supports keyboard paging and clamping while preserving child control keys", () => {
    render(<Reels />);
    const container = geometry();
    fireEvent.keyDown(container, { key: "End" });
    expect(container.scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: "auto" });
    fireEvent.keyDown(container, { key: "ArrowDown" });
    expect(screen.getByRole("status").textContent).toBe("2");
    fireEvent.keyDown(screen.getByText("Green"), { key: "Home" });
    expect(screen.getByRole("status").textContent).toBe("2");
    fireEvent.keyDown(container, { key: "ArrowUp" });
    expect(screen.getByRole("status").textContent).toBe("1");
    fireEvent.keyDown(container, { key: "Home" });
    expect(screen.getByRole("status").textContent).toBe("0");
  });

  it("retains selection after resize and handles shrinking and empty data", () => {
    const change = vi.fn();
    const view = render(<Reels onChange={change} />);
    const container = geometry();
    fireEvent.keyDown(container, { key: "End" });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 300 });
    act(() => observer.callback());
    expect(container.scrollTop).toBe(600);
    view.rerender(<Reels items={fixtures.slice(0, 1)} onChange={change} />);
    expect(screen.getByRole("status").textContent).toBe("0");
    view.rerender(<Reels items={[]} onChange={change} />);
    expect(screen.getByRole("status").textContent).toBe("-1");
    fireEvent.keyDown(container, { key: "End" });
    expect(screen.getByRole("status").textContent).toBe("-1");
  });
});
