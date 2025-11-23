# @quillai-network/mandates-core

[![npm version](https://img.shields.io/npm/v/@quillai-network/mandates-core)](https://www.npmjs.com/package/@quillai-network/mandates-core) ![License](https://img.shields.io/badge/license-MIT-blue.svg)


Core SDK for creating, signing, and verifying **Mandates** — deterministic agreements between AI or human agents, built for [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004).

---

## Overview

`@quillai-network/mandates-core` provides the foundational layer for defining and verifying **agent-to-agent commitments**.

It enables developers to:

* Create structured **Mandate** objects
* Canonicalize and hash payloads
* Generate and verify **EIP-191 / EIP-712** signatures
* Extend mandates with domain-specific primitives (e.g., `swap@1`, `bridge@1`)

This package forms the core of QuillAI Network’s verification layer, supporting decentralized agent coordination and trustless execution.

---

## Installation

```bash
npm install @quillai-network/mandates-core
```

or

```bash
yarn add @quillai-network/mandates-core
```

---

## Quickstart

```ts
import { Mandate } from "@quillai-network/mandates-core";

const mandate = new Mandate({
  version: "0.1.0",
  client: "eip155:1:0xClient...",
  server: "eip155:1:0xServer...",
  deadline: new Date(Date.now() + 600000).toISOString(),
  intent: "Swap 100 USDC for WBTC",
  core: {
    kind: "swap@1",
    payload: {
      amountIn: "100000000", // 100 USDC (6 decimals)
      tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      tokenOut: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
    }
  },
  signatures: {}
});

// Client and server sign the mandate
await mandate.signAsClient("0xPRIVATE_KEY_CLIENT");
await mandate.signAsServer("0xPRIVATE_KEY_SERVER");

// Validate client + server signatures
console.log(mandate.verifyAll()); // true
```

---

## Key Features

* **Typed mandate structure** for deterministic behavior
* **Canonicalization and hashing** of core payloads
* **Signature helpers** for both client and server roles
* **Primitive-based extensions**, compatible with
  `@quillai-network/primitives-registry`
* **Runs in both Node.js and browser environments**

---

## License

MIT © 2025 QuillAI Network

