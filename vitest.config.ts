import { defineConfig } from "vitest/config";

// Unit tests for the pure logic (exam builder/grader, certificate ids, course
// data, CSV helpers) plus one jsdom mount test for the app shell, which opts in
// with the `@vitest-environment jsdom` docblock.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: "default",
  },
});
