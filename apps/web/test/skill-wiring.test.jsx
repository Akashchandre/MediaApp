// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SkillWiringExample } from "../src/examples/SkillWiringExample.jsx";

const photo = (id) => ({
  id, kind: "photo", title: "Photo " + id, previewUrl: "/fixture-" + id + ".jpg",
  sources: { large: "/large-" + id + ".jpg", original: "/original-" + id + ".jpg" },
  creator: { name: "Fixture Author" }, pexelsUrl: "https://www.pexels.com/photo/" + id,
});
const page = (ids, number = 1, nextPage = null) => ({
  items: ids.map(photo), page: number, perPage: 24, nextPage, hasNextPage: nextPage !== null,
});
function fixtureClient() {
  const listeners = { view: new Set(), download: new Set() };
  const emit = (type, data) => {
    const event = { ...data, type, timestamp: 1 };
    listeners[type].forEach((listener) => listener(event));
    return event;
  };
  return {
    discover: vi.fn().mockResolvedValue(page(["1", "2"])),
    search: vi.fn().mockResolvedValue(page(["3"])),
    on: vi.fn((type, listener) => {
      listeners[type].add(listener);
      return () => listeners[type].delete(listener);
    }),
    trackView: vi.fn((data) => emit("view", data)),
    trackDownload: vi.fn((data) => emit("download", data)),
    listeners,
  };
}
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute("open", ""); } },
    close: { configurable: true, value() { this.removeAttribute("open"); } },
  });
});
afterEach(() => {
  cleanup();
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
});

it("wires real wrapper/UI hooks and tracks open, navigation, and download once", async () => {
  const client = fixtureClient();
  const activity = vi.fn();
  const view = render(<SkillWiringExample client={client} onActivity={activity} />, { reactStrictMode: true });
  const trigger = await screen.findByRole("button", { name: "Photo 1" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Photo preview" });
  expect(client.trackView).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "Next item" }));
  expect(client.trackView).toHaveBeenLastCalledWith({ mediaId: "2", kind: "photo" });
  expect(client.trackView).toHaveBeenCalledTimes(2);
  const download = within(dialog).getByRole("link", { name: "Request download" });
  // Prevent jsdom navigation; keep React's click callback running.
  download.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(download);
  expect(client.trackDownload).toHaveBeenCalledWith({ mediaId: "2", kind: "photo" });
  expect(activity).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  expect(client.trackView).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(client.listeners.view.size).toBe(0);
  expect(client.listeners.download.size).toBe(0);
});

it("retains the grid on pagination failure and retries the failed page", async () => {
  const client = fixtureClient();
  client.discover.mockReset().mockResolvedValueOnce(page(["1"], 1, 2))
    .mockRejectedValueOnce(new Error("Pagination unavailable"))
    .mockResolvedValueOnce(page(["2"], 2));
  render(<SkillWiringExample client={client} />);
  await screen.findByRole("button", { name: "Photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Pagination unavailable");
  expect(screen.getByRole("button", { name: "Photo 1" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByRole("button", { name: "Photo 2" });
  expect(client.discover.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 2]);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("retries an initial failure and renders a successful empty result", async () => {
  const client = fixtureClient();
  client.discover.mockReset().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(page([]));
  render(<SkillWiringExample client={client} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No photos found.");
});

it("uses search and resets lightbox selection when the submitted query changes", async () => {
  const client = fixtureClient();
  const view = render(<SkillWiringExample client={client} />);
  fireEvent.click(await screen.findByRole("button", { name: "Photo 1" }));
  view.rerender(<SkillWiringExample client={client} query="forest" />);
  await screen.findByRole("button", { name: "Photo 3" });
  expect(screen.queryByRole("dialog")).toBeNull();
  await waitFor(() => expect(client.search).toHaveBeenCalledWith(expect.objectContaining({
    query: "forest", kind: "photo", page: 1,
  })));
});
