# @quillai-network/mandates-core

[![npm version](https://badge.fury.io/js/@quillai-network%2Fmandates-core.svg)](https://badge.fury.io/js/@quillai-network%2Fmandates-core)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
[![ERC-8004 v1.0](https://img.shields.io/badge/ERC--8004-v1.0-success.svg)](https://eips.ethereum.org/EIPS/eip-8004)

TypeScript SDK for creating, signing, and verifying Mandates: deterministic agreements between a client agent and a server agent. Built to interoperate with the ERC-8004 agent ecosystem.

## Overview

A Mandate is a signed object that captures:
- who the client and server are
- what the intent is
- what the task body is (`core`)
- the deadline and metadata required to verify the agreement

This package focuses on the core lifecycle:
- construct a mandate
- sign as server and/or client (EIP-191 and EIP-712)
- verify signatures deterministically
- attach any `core` payload shape (custom or registry-based)

If you want to build `core` from a remote primitives registry, use `buildCore`.

## Installation

```bash
npm install @quillai-network/mandates-core
````

```bash
yarn add @quillai-network/mandates-core
```

## Quickstart

### 1) Create, sign, and verify a mandate

```ts
import { Mandate, caip10 } from "@quillai-network/mandates-core";
import { Wallet } from "ethers";

const client = Wallet.createRandom();
const server = Wallet.createRandom();

const mandate = new Mandate({
  mandateId: "01J9X9A3T3DMD3M3CYAJW1Y0SZ",
  version: "0.1.0",
  client: caip10(1, client.address),
  server: caip10(1, server.address),
  createdAt: new Date().toISOString(),
  deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  intent: "Swap 100 USDC for WBTC",
  core: {
    kind: "swap@1",
    payload: {
      amountIn: "100000000",
      tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      tokenOut: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      minOut: "165000",
      recipient: client.address,
      deadline: "2025-12-31T00:00:00Z",
      chainId: 1
    }
  },
  signatures: {}
});

await mandate.signAsServer(server, "eip191"); // offer
await mandate.signAsClient(client, "eip191"); // accept

const res = mandate.verifyAll();
console.log(res.server.ok, res.client.ok); // true true
```

### 2) Attach a custom core without any registry

`core` is intentionally flexible. You can attach any structured payload as long as it follows:

```ts
{ kind: string; payload: Record<string, unknown> }
```

```ts
const custom = new Mandate({
  mandateId: "01J9X9A3T3DMD3M3CYAJW1Y0SZ",
  version: "0.1.0",
  client: caip10(1, client.address),
  server: caip10(1, server.address),
  createdAt: new Date().toISOString(),
  deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  intent: "Run my custom task",
  core: {
    kind: "myTask@1",
    payload: { foo: "bar", amount: 123 }
  },
  signatures: {}
});
```

### 3) Build core from a primitives registry

```ts
import { buildCore } from "@quillai-network/mandates-core";

const BASE_URL =
  "https://raw.githubusercontent.com/quillai-network/mandate-specs/main/spec";

const core = await buildCore(
  "swap@1",
  {
    chainId: 1,
    tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenOut: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    amountIn: "100000000",
    minOut: "165000",
    recipient: client.address,
    deadline: "2025-12-31T00:00:00Z"
  },
  BASE_URL
);
```

## API surface

* `class Mandate`

  * `signAsServer(signer, alg)`
  * `signAsClient(signer, alg)`
  * `verifyAll()`
  * `verifyRole("client" | "server")`
  * `toJSON()`
* `buildCore(kind, payload, baseUrl?)`
* `caip10(chainId, address)` (helper for `eip155:<chainId>:<address>`)

## Notes

* `verifyAll()` returns a structured object (per-role verification details), not a boolean.
* Registry fetching inside `buildCore()` may be cached between calls. If you unit test `buildCore`, avoid asserting on the exact number of fetch calls unless you reset modules/mocks.

## License

MIT © 2025 QuillAI Network


