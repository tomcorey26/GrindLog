// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default value when nothing stored", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", { count: 0 }),
    );
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it("returns stored value from localStorage", () => {
    localStorage.setItem("test-key", JSON.stringify({ count: 5 }));
    const { result } = renderHook(() =>
      useLocalStorage("test-key", { count: 0 }),
    );
    expect(result.current[0]).toEqual({ count: 5 });
  });

  it("returns default when localStorage has invalid JSON", () => {
    localStorage.setItem("test-key", "not-json");
    const { result } = renderHook(() =>
      useLocalStorage("test-key", { count: 0 }),
    );
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it("updates state and localStorage when setValue is called", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", { count: 0 }),
    );

    act(() => {
      result.current[1]({ count: 10 });
    });

    expect(result.current[0]).toEqual({ count: 10 });
    expect(JSON.parse(localStorage.getItem("test-key")!)).toEqual({
      count: 10,
    });
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(JSON.parse(localStorage.getItem("counter")!)).toBe(1);
  });

  it("works with primitive values", () => {
    const { result } = renderHook(() =>
      useLocalStorage("name", "default"),
    );
    expect(result.current[0]).toBe("default");

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(localStorage.getItem("name")!)).toBe("updated");
  });
});
