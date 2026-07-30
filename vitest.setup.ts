import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// `globals: false` means RTL can't auto-detect a global afterEach to run its
// cleanup, so without this, DOM from one component test leaks into the next
// (e.g. document.querySelector would find a stale element from a prior test).
if (typeof document !== "undefined") {
  afterEach(() => {
    cleanup();
  });
}

// jsdom doesn't implement HTMLDialogElement.showModal()/close() (only real
// browsers do — verified against jsdom 29). Polyfill the minimum spec
// behavior our Modal component relies on so it's unit-testable in jsdom;
// real behavior is still exercised by Playwright e2e in a real browser.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
