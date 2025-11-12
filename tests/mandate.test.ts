import { describe, it, expect } from "vitest";
import { Wallet } from "ethers";
import { Mandate } from "../src/mandate";
import { caip10 } from "../src/utils";

describe("Mandate", () => {
  it("signs and verifies", async () => {
    const A = Wallet.createRandom();
    const B = Wallet.createRandom();

    const m = new Mandate({
        client: caip10(1, A.address as `0x${string}`),
        server: caip10(1, B.address as `0x${string}`),
        deadline: new Date(Date.now() + 600000).toISOString(),
        intent: "Example intent",
        core: { kind: "swap@1", payload: {} }
      });


    await m.signAsServer(B, "eip191");
    await m.signAsClient(A, "eip191");

    const details = m.verifyAll(); // { client: { ok: true, ... }, server: { ok: true, ... } }
    expect(details.client.ok && details.server.ok).toBe(true);
  });
});

