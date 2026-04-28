import { renderHook, act } from "@testing-library/react";
import { useDigitalGuide } from "./useDigitalGuide";
import { api } from "@/lib/api_client";

jest.mock("@/lib/api_client", () => ({
  api: {
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
  }
}));

describe("useDigitalGuide Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default values", async () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeThreadId).toBeNull();
  });

  it("should update input state", async () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.setInput("Hello world");
    });
    
    expect(result.current.input).toBe("Hello world");
  });

  it("should fetch threads on mount", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce([{ id: "1", title: "Test" }]);
    const { result } = renderHook(() => useDigitalGuide());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(Array.isArray(result.current.threads)).toBe(true);
  });

  it("should handle document selection", async () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.handleDocumentClick("test.pdf#page=1");
    });
    
    expect(result.current.activeDocument).toBe("test.pdf");
    expect(result.current.activePage).toBe("page=1");
    expect(result.current.recentDocs).toContain("test.pdf");
  });

  it("should show toast correctly", async () => {
    const { result } = renderHook(() => useDigitalGuide());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
        result.current.showToast("Test message");
    });
    
    expect(result.current.toast.show).toBe(true);
    expect(result.current.toast.message).toBe("Test message");
  });
});
