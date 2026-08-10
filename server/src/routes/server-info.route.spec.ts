import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
    type MockedFunction,
} from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import serverInfoRoutes from "./server-info.route.js";
import { redis } from "../lib/redis.js";
import { getServerInfoService } from "../services/server-info.service.js";

vi.mock("../lib/redis.js", () => ({
    redis: {
        status: "ready",
        get: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock("../services/server-info.service.js", () => ({
    getServerInfoService: vi.fn(),
}));

type NonNullRedis = NonNullable<typeof redis>;

const mockedRedisGet = (redis as NonNullRedis).get as MockedFunction<NonNullRedis["get"]>;
const mockedRedisSet = (redis as NonNullRedis).set as MockedFunction<NonNullRedis["set"]>;
const mockedGetServerInfoService = getServerInfoService as MockedFunction<
    typeof getServerInfoService
>;

describe("GET /server-info", () => {
    let app: FastifyInstance;

    const mockServerData = {
        guildName: "Test Guild",
        guildId: "1234567890",
        guildIconURL: "https://cdn.discordapp.com/icons/123/icon.png",
        guildBannerURL: null,
        vanityURL: "test-server",
        ownerId: "9876543210",
        memberCount: {
            total: 100,
            online: 40,
            human: 90,
            bot: 10,
            activeVoice: 5,
        },
        channels: {
            categories: 2,
            totalChannel: 10,
            textChannel: 5,
            voiceChannel: 3,
            stage: 1,
            announcement: 1,
            forum: 0,
        },
        created: {
            timestamp: "2023-01-01T00:00:00.000Z",
            ageInDays: 365,
        },
        scheduledEvents: [],
        boost: {
            count: 2,
            tier: 1,
        },
        assets: {
            role: 15,
            emoji: 20,
            sticker: 5,
        },
        features: ["VANITY_URL", "COMMUNITY"],
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        app = Fastify();
        await app.register(serverInfoRoutes);
        await app.ready();
    });

    it("should return cached data with X-Cache: HIT header when available in Redis", async () => {
        mockedRedisGet.mockResolvedValueOnce(JSON.stringify(mockServerData));

        const response = await app.inject({
            method: "GET",
            url: "/server-info",
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["x-cache"]).toBe("HIT");

        const payload = JSON.parse(response.payload) as {
            success: boolean;
            data: typeof mockServerData;
        };

        expect(payload).toEqual({
            success: true,
            data: mockServerData,
        });

        expect(mockedRedisGet).toHaveBeenCalledWith("server:info");
        expect(mockedGetServerInfoService).not.toHaveBeenCalled();
    });

    it("should fetch service data, cache it, and return X-Cache: MISS header on cache miss", async () => {
        mockedRedisGet.mockResolvedValueOnce(null);
        mockedGetServerInfoService.mockResolvedValueOnce({
            success: true,
            data: mockServerData,
        });
        mockedRedisSet.mockResolvedValueOnce("OK");

        const response = await app.inject({
            method: "GET",
            url: "/server-info",
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["x-cache"]).toBe("MISS");

        const payload = JSON.parse(response.payload) as {
            success: boolean;
            data: typeof mockServerData;
        };

        expect(payload).toEqual({
            success: true,
            data: mockServerData,
        });

        expect(mockedRedisGet).toHaveBeenCalledWith("server:info");
        expect(mockedGetServerInfoService).toHaveBeenCalledOnce();
        expect(mockedRedisSet).toHaveBeenCalledWith(
            "server:info",
            JSON.stringify(mockServerData),
            "EX",
            300,
        );
    });

    it("should return status 500 when server info service returns success: false", async () => {
        mockedRedisGet.mockResolvedValueOnce(null);
        mockedGetServerInfoService.mockResolvedValueOnce({
            success: false,
        });

        const response = await app.inject({
            method: "GET",
            url: "/server-info",
        });

        expect(response.statusCode).toBe(500);

        const payload = JSON.parse(response.payload) as {
            success: boolean;
            statusCode: number;
            message: string;
        };

        expect(payload).toEqual({
            success: false,
            statusCode: 500,
            message: "Something went wrong.",
        });

        expect(mockedRedisSet).not.toHaveBeenCalled();
    });

    it("should fall back gracefully to service data if Redis read fails", async () => {
        mockedRedisGet.mockRejectedValueOnce(
            new Error("Redis Connection Error"),
        );
        mockedGetServerInfoService.mockResolvedValueOnce({
            success: true,
            data: mockServerData,
        });

        const response = await app.inject({
            method: "GET",
            url: "/server-info",
        });

        // Endpoint should complete successfully despite Redis error
        expect(response.statusCode).toBe(200);
        expect(response.headers["x-cache"]).toBe("MISS");

        const payload = JSON.parse(response.payload);
        expect(payload).toEqual({
            success: true,
            data: mockServerData,
        });

        expect(mockedGetServerInfoService).toHaveBeenCalledOnce();
    });

    it("should handle service execution exceptions gracefully and return 500", async () => {
        mockedRedisGet.mockResolvedValueOnce(null);
        mockedGetServerInfoService.mockRejectedValueOnce(
            new Error("Internal Service Failure"),
        );

        const response = await app.inject({
            method: "GET",
            url: "/server-info",
        });

        expect(response.statusCode).toBe(500);

        const payload = JSON.parse(response.payload);
        expect(payload).toEqual({
            success: false,
            statusCode: 500,
            message: "Internal Server Error",
        });
    });

    it("should skip redis completely when redis status is not ready", async () => {
      // Temporarily mutate status
      (redis as NonNullRedis).status = "connecting";

      mockedGetServerInfoService.mockResolvedValueOnce({
        success: true,
        data: mockServerData,
      });

      const response = await app.inject({
        method: "GET",
        url: "/server-info",
      });

      expect(response.statusCode).toBe(200);
      expect(mockedRedisGet).not.toHaveBeenCalled();
      expect(mockedRedisSet).not.toHaveBeenCalled();
      expect(mockedGetServerInfoService).toHaveBeenCalledOnce();

      // Restore status
      (redis as NonNullRedis).status = "ready";
});
});
