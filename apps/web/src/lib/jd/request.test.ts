import { describe, expect, it } from "vitest";

import { buildCallUrl, errorMessage, isAllowedPath, unwrap } from "./request";

describe("isAllowedPath", () => {
  it("lets through the known namespaces", () => {
    expect(isAllowedPath("downloadsV2/queryLinks")).toBe(true);
    expect(isAllowedPath("linkgrabberv2/addLinks")).toBe(true);
  });

  it("refuses other namespaces and odd paths", () => {
    expect(isAllowedPath("system/../jd")).toBe(false);
    expect(isAllowedPath("dialogs/answer")).toBe(false);
    expect(isAllowedPath("downloadsV2")).toBe(false);
    expect(isAllowedPath("downloadsV2/queryLinks?x")).toBe(false);
  });
});

describe("buildCallUrl", () => {
  it("sends no query without parameters", () => {
    expect(buildCallUrl("http://engine:3128/", "jd/version", [])).toBe(
      "http://engine:3128/jd/version",
    );
  });

  it("sends each parameter JSON-encoded, in order", () => {
    const url = buildCallUrl("http://engine:3128", "downloadsV2/renameLink", [12, "a b.zip"]);
    expect(url).toBe(
      `http://engine:3128/downloadsV2/renameLink?12&${encodeURIComponent('"a b.zip"')}`,
    );
    const [, query] = url.split("?");
    expect(query.split("&").map((part) => JSON.parse(decodeURIComponent(part)))).toEqual([
      12,
      "a b.zip",
    ]);
  });

  it("sends objects and arrays", () => {
    const url = buildCallUrl("http://e", "downloadsV2/setEnabled", [true, [1, 2], []]);
    expect(decodeURIComponent(url)).toBe("http://e/downloadsV2/setEnabled?true&[1,2]&[]");
  });
});

describe("unwrap", () => {
  it("takes the data out of the wrapper", () => {
    expect(unwrap({ data: [1], rid: 5 })).toEqual([1]);
    expect(unwrap({ data: null })).toBeNull();
  });

  it("keeps bare answers and objects that only have a data field among others", () => {
    expect(unwrap([1, 2])).toEqual([1, 2]);
    expect(unwrap({ data: 1, other: 2 })).toEqual({ data: 1, other: 2 });
    expect(unwrap("RUNNING")).toBe("RUNNING");
  });
});

describe("errorMessage", () => {
  it("reads JDownloader's error body", () => {
    expect(errorMessage(400, '{"type":"BAD_PARAMETERS","data":"linkIds"}')).toBe(
      "BAD_PARAMETERS: linkIds",
    );
    expect(errorMessage(404, '{"type":"API_COMMAND_NOT_FOUND"}')).toBe("API_COMMAND_NOT_FOUND");
  });

  it("falls back to the text or the status", () => {
    expect(errorMessage(500, "boom")).toBe("boom");
    expect(errorMessage(502, "")).toBe("HTTP 502");
  });
});
