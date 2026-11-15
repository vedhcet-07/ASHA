import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Clear localStorage between tests so the Zustand persist middleware starts
// from a clean slate every time.
beforeEach(() => {
  localStorage.clear();
});
