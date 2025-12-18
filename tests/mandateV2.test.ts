// tests/test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Wallet } from "ethers";

import { Mandate, buildCore, caip10 } from "../src"; // adjust if your exports differ

type MockResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
};

function mockJsonResponse(body: any, ok = true): MockResponse {
  return {
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? "OK" : "Not Found",
    json: async () => body,
  };
}

const BASE_URL = "https://raw.githubusercontent.com/quillai-network/mandate-specs/main/spec";

const REGISTRY_JSON = {
  specVersion: "0.1.0",
  primitives: [
    {
      kind: "swap@1",
      name: "swap",
      version: 1,
      schemaPath: "primitives/swap/swap@1.schema.json",
      description: "Chain-agnostic token swap primitive.",
    },
  ],
};

// Schema content can be minimal for day-one, since buildCore only checks existence.
const SWAP_SCHEMA_JSON = {
  kind: "swap@1",
  payloadSchema: {
    type: "object",
    properties: {
      chainId: { type: "number" },
    },
  },
};

describe("mandates-core primitives integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1) works with a custom core object (no buildCore)", async () => {
    const client = Wallet.createRandom();
    const server = Wallet.createRandom();

    const customCore = {
      kind: "customTask@1",
      payload: {
        foo: "bar",
        amount: 123,
      },
    };

    const m = new Mandate({
      mandateId: "01J9X9A3T3DMD3M3CYAJW1Y0SZ",
      version: "0.1.0",
      client: caip10(1,client.address),
      server: caip10(1,server.address),
      createdAt: "2025-10-23T10:00:00Z",
      deadline: "2025-10-23T10:20:00Z",
      intent: "Demo custom task mandate",
      core: customCore,
      signatures: {}, // allow SDK to populate
    });

    await m.signAsServer(server, "eip191");
    await m.signAsClient(client, "eip191");

    const res = m.verifyAll();
    expect(res.server.ok).toBe(true);
    expect(res.client.ok).toBe(true);
  });

  it("2) builds core from registry using buildCore(kind, payload) and signs/verifies", async () => {
    // Mock fetch so tests don’t depend on network
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${BASE_URL}/primitives/registry.json`) {
        return mockJsonResponse(REGISTRY_JSON);
      }
      if (url === `${BASE_URL}/primitives/swap/swap@1.schema.json`) {
        return mockJsonResponse(SWAP_SCHEMA_JSON);
      }
      return mockJsonResponse({ error: "not found" }, false);
    });

    // Stub global fetch
    // @ts-expect-error - vitest stub
    globalThis.fetch = fetchMock;

    const client = Wallet.createRandom();
    const server = Wallet.createRandom();

    const core = await buildCore(
      "swap@1",
      {
        chainId: 1,
        tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        tokenOut: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        amountIn: "100000000",
        minOut: "165000",
        recipient: client.address,
        deadline: "2025-12-31T00:00:00Z",
      },
      BASE_URL
    );

    expect(core.kind).toBe("swap@1");
    expect(core.payload.chainId).toBe(1);

    const m = new Mandate({
      mandateId: "01J9X9A3T3DMD3M3CYAJW1Y0SZ",
      version: "0.1.0",
      client: caip10(1,client.address),
      server: caip10(1,server.address),
      createdAt: "2025-10-23T10:00:00Z",
      deadline: "2025-10-23T10:20:00Z",
      intent: "Swap 100 USDC for WBTC",
      core,
      signatures: {},
    });

    await m.signAsServer(server, "eip191");
    await m.signAsClient(client, "eip191");

    const res = m.verifyAll();
    expect(res.server.ok).toBe(true);
    expect(res.client.ok).toBe(true);

    // Optional sanity: ensure registry + schema were fetched
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/primitives/registry.json`);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/primitives/swap/swap@1.schema.json`);
  });

  it("3) buildCore throws for invalid kind", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${BASE_URL}/primitives/registry.json`) {
        return mockJsonResponse(REGISTRY_JSON);
      }
      return mockJsonResponse({ error: "not found" }, false);
    });

    // @ts-expect-error - vitest stub
    globalThis.fetch = fetchMock;

    await expect(
      buildCore("doesNotExist@1", { hello: "world" })
    ).rejects.toThrow(/not found in registry/);

  });
});
