export type ISO8601 = string;
export type Bytes32 = `0x${string}`;
export type Hex = `0x${string}`;
export type CAIP10 = `eip155:${number}:${`0x${string}`}`;
export type PrimitiveKind = string; // e.g. "swap@1"

export interface PrimitiveCore<K extends PrimitiveKind = PrimitiveKind, P = any> {
  kind: K;               // discriminator your registry will match on
  payload: P;            // task-specific data
}


export type Core = PrimitiveCore;  

export type SigAlg = "eip712" | "eip191";

export interface Signature {
  alg: SigAlg;
  signer?: CAIP10;
  chainId?: number;
  domain?: Record<string, unknown>;
  mandateHash: Bytes32;
  signature: Hex;
  createdAt?: ISO8601;
}

export interface MandateBase {
  mandateId: string;
  version?: string;
  client: CAIP10;
  server: CAIP10;
  createdAt: ISO8601;
  deadline: ISO8601;
  intent: string;
  core: PrimitiveCore; // free-form
}

export interface MandateSignatures {
  clientSig: Signature;
  serverSig: Signature;
}

export type MandateJSON = MandateBase & { signatures: MandateSignatures };
export type MandateInit = Omit<MandateBase, "mandateId" | "createdAt"> & {
  mandateId?: string;
  createdAt?: ISO8601;
  signatures?: Partial<MandateSignatures>;
};


// Convenience result shapes
export interface VerifyResult {
    ok: true;
    recovered: string;           // 0x-address
    recomputedHash: Bytes32;
    alg: SigAlg;
}

export interface VerifyAllResult {
    client: VerifyResult;
    server: VerifyResult;
}
  

/** Zero-coupling interop with a primitives registry */
export interface PrimitiveRegistryLike {
    validate(core: PrimitiveCore): { ok: true } | { ok: false; reason: string };
    parse<T>(core: PrimitiveCore): T; // may throw on invalid
}