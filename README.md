# @quillai/mandates-core

Core SDK for creating, signing, and verifying **Mandates** — deterministic agreements between AI or human agents, built for [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004).

---

## Overview

`@quillai/mandates-core` provides the foundational layer for defining and verifying agent-to-agent commitments.

It enables developers to:
- Create structured Mandate objects
- Canonicalize and hash payloads
- Generate and verify EIP-191 / EIP-712 signatures
- Extend with domain-specific primitives (e.g., `swap@1`, `bridge@1`)

This package forms the basis for QuillAI’s agent verification layer and open agent-to-agent commerce.

---

## Installation

```bash
npm install @quillai/mandates-core
```

---

## Usage

```ts
import { Mandate } from "@quillai/mandates-core";

const mandate = new Mandate({
  version: "0.1.0",
  client: "eip155:1:0xClient...",
  server: "eip155:1:0xServer...",
  deadline: new Date(Date.now() + 600000).toISOString(),
  intent: "Swap 100 USDC for WBTC",
  core: {
    kind: "swap@1",
    payload: {
      amountIn: "100000000",
      tokenIn: "0x...",
      tokenOut: "0x..."
    }
  },
  signatures: {}
});

await mandate.signAsClient("0xPRIVATE_KEY_CLIENT");
await mandate.signAsServer("0xPRIVATE_KEY_SERVER");

console.log(mandate.verifyAll()); // true
```