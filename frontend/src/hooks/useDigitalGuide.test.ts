import { renderHook, act } from "@testing-library/react";
import { useDigitalGuide } from "./useDigitalGuide";
import { api } from "@/lib/api_client";

// Option A: We try to use real API where possible, 
// but for some state transitions we might need to wait for results.

describe("useDigitalGuide Hook", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeThreadId).toBeNull();
  });

  it("should update input state", () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    act(() => {
      result.current.setInput("Hello world");
    });
    
    expect(result.current.input).toBe("Hello world");
  });

  it("should fetch threads on mount", async () => {
    // This will hit the real backend if it's running
    const { result } = renderHook(() => useDigitalGuide());
    
    // Wait for atmospheric effects (data fetching)
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    expect(Array.isArray(result.current.threads)).toBe(true);
  });

  it("should handle document selection", () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    act(() => {
      result.current.handleDocumentClick("test.pdf#page=1");
    });
    
    expect(result.current.activeDocument).toBe("test.pdf");
    expect(result.current.activePage).toBe("page=1");
    expect(result.current.recentDocs).toContain("test.pdf");
  });

  it("should show toast correctly", () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    act(() => {
        result.current.showToast("Test message");
    });
    
    expect(result.current.toast.show).toBe(true);
    expect(result.current.toast.message).toBe("Test message");
  });
});
