import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const canonicalize: (input: unknown) => string | undefined = require("canonicalize");
const { ulid } = require("ulid") as { ulid: () => string };
import { HDNodeWallet, keccak256, toUtf8Bytes, verifyMessage, verifyTypedData, type TypedDataDomain } from "ethers";
import type {
  Bytes32,
  Hex,
  MandateInit,
  MandateJSON,
  MandateSignatures,
  MandateBase,
  Signature,
  SigAlg,
  VerifyAllResult,
  VerifyResult
} from "./types.js";

import { addrFromCaip10, deepClone } from "./utils.js";


// Internal helpers
function canonicalizeForHash(doc: Partial<MandateJSON>): string {
  const m = deepClone(doc);
  // spec: exclude signatures from the signing payload // @ts-expect-error - may exist
  delete (m as Partial<MandateJSON>).signatures;
  const jcs = canonicalize(m);
  if (!jcs) throw new Error("canonicalize() returned empty string");
  return jcs;
}
function computeMandateHash(doc: Partial<MandateJSON>): Bytes32 {
  const jcs = canonicalizeForHash(doc);
  return keccak256(toUtf8Bytes(jcs)) as Bytes32;
}

export class Mandate {
  private m: MandateBase & Partial<{ signatures: MandateSignatures }>;

  constructor(init: MandateInit) {
    if (!init.client || !init.server) throw new Error("client and server are required (CAIP-10)");
    if (!init.deadline) throw new Error("deadline (ISO 8601) is required");
    if (init.version && init.version !== '0.1.0') throw new Error("version must be 0.1.0");

    if (!init.core) throw new Error("core is required");
    if (!init.core.kind) throw new Error("core.kind is required");
    if (!init.core.payload) throw new Error("core.payload is required");

    const base: MandateBase = {
      mandateId: init.mandateId ?? ulid(),
      version: init.version ?? "0.1.0",
      client: init.client,
      server: init.server,
      createdAt: init.createdAt ?? new Date().toISOString(),
      deadline: init.deadline,
      intent: init.intent ?? "",
      core: init.core ?? {}
    };

    this.m = { ...base };
    if (init.signatures) {
      // allow partial on construct; attach only if both present later
      this.m.signatures = init.signatures as MandateSignatures;
    }
  }

  // ----- views -------------------------------------------------------------

  toJSON(): MandateJSON | (MandateBase & { signatures?: MandateSignatures }) {
    return deepClone(this.m) as MandateBase & { signatures?: MandateSignatures };
  }

  toCanonicalString(): string {
    return canonicalizeForHash(this.m);
  }

  mandateHash(): Bytes32 {
    return computeMandateHash(this.m);
  }

  // ----- signing -----------------------------------------------------------

  private attachSig(role: "client" | "server", sig: Signature) {
    this.m.signatures = this.m.signatures || ({} as MandateSignatures);
    if (role === "client") (this.m.signatures as MandateSignatures).clientSig = sig;
    else (this.m.signatures as MandateSignatures).serverSig = sig;
  }

  /**
   * Sign document as a role using EIP-191 (default) or EIP-712 (typed-data).
   */
  async sign(
    role: "client" | "server",
    wallet: HDNodeWallet,
    alg: SigAlg = "eip191",
    domain?: TypedDataDomain
  ): Promise<Signature> {
    const jcs = this.toCanonicalString();
    const mandateHash = keccak256(toUtf8Bytes(jcs)) as Bytes32;

    let signature: Hex;

    if (alg === "eip191") {
      signature = (await wallet.signMessage(toUtf8Bytes(jcs))) as Hex;
    } else if (alg === "eip712") {
      if (!domain || typeof domain.chainId !== "number") {
        throw new Error("EIP-712 requires a domain with chainId");
      }
      const types: Record<string, Array<{ name: string; type: string }>> = {
        Mandate: [{ name: "mandateHash", type: "bytes32" }]
      };
      const value = { mandateHash };
      signature = (await wallet.signTypedData(domain, types, value)) as Hex;
    } else {
      throw new Error(`Unsupported alg: ${alg}`);
    }

    const sig: Signature = { alg, mandateHash, signature };
    this.attachSig(role, sig);
    return sig;
  }

  signAsClient(wallet: HDNodeWallet, alg: SigAlg = "eip191", domain?: TypedDataDomain) {
    return this.sign("client", wallet, alg, domain);
  }

  signAsServer(wallet: HDNodeWallet, alg: SigAlg = "eip191", domain?: TypedDataDomain) {
    return this.sign("server", wallet, alg, domain);
  }

  // ----- verification ------------------------------------------------------

  verifyRole(role: "client" | "server", domain?: TypedDataDomain): VerifyResult {
    if (!this.m.signatures) throw new Error("no signatures present");
    const sigObj = role === "client" ? this.m.signatures.clientSig : this.m.signatures.serverSig;
    if (!sigObj) throw new Error(`${role}Sig missing`);

    const { alg, mandateHash, signature } = sigObj;

    // 1) recompute mandateHash from doc (excluding signatures)
    const recomputed = this.mandateHash();
    if (mandateHash.toLowerCase() !== recomputed.toLowerCase()) {
      throw new Error(`${role}Sig.mandateHash mismatch`);
    }

    // 2) recover signer
    let recovered: string;
    if (alg === "eip191") {
      recovered = verifyMessage(toUtf8Bytes(this.toCanonicalString()), signature);
    } else if (alg === "eip712") {
      if (!domain || typeof domain.chainId !== "number") {
        throw new Error("EIP-712 verification requires domain with chainId");
      }
      const types: Record<string, Array<{ name: string; type: string }>> = {
        Mandate: [{ name: "mandateHash", type: "bytes32" }]
      };
      const value = { mandateHash };
      recovered = verifyTypedData(domain, types, value, signature);
    } else {
      throw new Error(`Unsupported alg: ${alg}`);
    }

    // 3) compare against CAIP-10 role address
    const expected = addrFromCaip10(role === "client" ? this.m.client : this.m.server).toLowerCase();
    if (recovered.toLowerCase() !== expected) {
      throw new Error(`${role} signature invalid: expected ${expected}, got ${recovered}`);
    }

    return { ok: true, recovered, recomputedHash: recomputed, alg };
  }

  verifyAll(domainForClient?: TypedDataDomain, domainForServer?: TypedDataDomain): VerifyAllResult {
    return {
      client: this.verifyRole("client", domainForClient),
      server: this.verifyRole("server", domainForServer)
    };
  }

  // Factory
  static fromObject(obj: MandateJSON | MandateBase & { signatures?: MandateSignatures }) {
    return new Mandate(obj as MandateInit);
  }
}
