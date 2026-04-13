import { api } from "./api_client";

describe("api_client integration (mocked)", () => {
    beforeEach(() => {
        global.fetch = jest.fn((url: RequestInfo | URL) => {
            const urlStr = url.toString();
            if (urlStr.includes('/api/library/documents')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([{ filename: 'test.pdf' }])
                } as Response);
            }
            if (urlStr.includes('/api/stats/dashboard')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ total_questions: 42 })
                } as Response);
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    it("should fetch documents from the mock backend", async () => {
        const response = await api.get<any[]>("/api/library/documents");
        expect(Array.isArray(response)).toBe(true);
        expect(response[0]).toHaveProperty("filename");
    });

    it("should fetch dashboard stats", async () => {
        const stats = await api.get<any>("/api/stats/dashboard");
        expect(stats).toHaveProperty("total_questions");
        expect(typeof stats.total_questions).toBe("number");
    });
});
