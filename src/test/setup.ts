import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees + reset between tests.
afterEach(() => {
  cleanup();
  // Guard: some tests swap in / delete the global localStorage themselves.
  if (typeof localStorage !== "undefined") localStorage.clear();
});
