import { describe, expect, it } from "vitest";

import { chunkLinks } from "./jd/api";
import { bytes, duration, enumLabel, eta, percent, speed } from "./format";

describe("bytes", () => {
  it("picks the unit", () => {
    expect(bytes(0)).toBe("0 B");
    expect(bytes(1536)).toBe("1,5 KB");
    expect(bytes(200 * 1024 * 1024)).toBe("200 MB");
    expect(bytes(3.25 * 1024 ** 3)).toBe("3,3 GB");
  });

  it("shows unknown sizes as a dash", () => {
    expect(bytes(-1)).toBe("–");
    expect(bytes(undefined)).toBe("–");
  });
});

describe("speed", () => {
  it("adds per second and shows idle as zero", () => {
    expect(speed(2048)).toBe("2,0 KB/s");
    expect(speed(0)).toBe("0 B/s");
    expect(speed(undefined)).toBe("0 B/s");
  });
});

describe("eta", () => {
  it("formats seconds left", () => {
    expect(eta(12)).toBe("12s");
    expect(eta(249)).toBe("4m 09s");
    expect(eta(3900)).toBe("1h 05m");
    expect(eta(90000)).toBe("1d 1h");
  });

  it("is empty when unknown", () => {
    expect(eta(-1)).toBe("");
    expect(eta(0)).toBe("");
  });
});

describe("duration", () => {
  it("formats uptime", () => {
    expect(duration(5 * 60000)).toBe("5m");
    expect(duration(130 * 60000)).toBe("2h 10m");
    expect(duration((3 * 1440 + 4 * 60) * 60000)).toBe("3d 4h");
  });
});

describe("percent", () => {
  it("is null without a total", () => {
    expect(percent(5, -1)).toBeNull();
    expect(percent(5, 0)).toBeNull();
  });

  it("caps at 100", () => {
    expect(percent(50, 200)).toBe(25);
    expect(percent(300, 200)).toBe(100);
  });
});

describe("enumLabel", () => {
  it("makes enum values readable", () => {
    expect(enumLabel("DELETE_FINISHED")).toBe("Delete finished");
  });
});

describe("chunkLinks", () => {
  it("drops blank lines and keeps short lists in one call", () => {
    expect(chunkLinks(" a \n\n b\r\nc ")).toEqual(["a\nb\nc"]);
  });

  it("splits long lists on whole lines", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `https://host/${i}`.padEnd(20, "x"));
    const chunks = chunkLinks(lines.join("\n"), 50);
    expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
    expect(chunks.join("\n").split("\n")).toEqual(lines);
  });

  it("is empty for blank text", () => {
    expect(chunkLinks("  \n ")).toEqual([]);
  });
});
