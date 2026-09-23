import { describe, expect, it } from "vitest";
import * as native from "../src/index.js";
import * as web from "../../media-react/src/index.js";

describe("media-native contract", () => {
  it("matches the React wrapper exports", () => {
    expect(Object.keys(native).sort()).toEqual(Object.keys(web).sort());
  });
});
