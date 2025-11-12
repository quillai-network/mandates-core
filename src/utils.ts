import type { CAIP10 } from "./types.js";

export function caip10(chainId: number, address: string): CAIP10 {
  return `eip155:${chainId}:${address}` as CAIP10;
}
export function addrFromCaip10(id: CAIP10): string {
  return id.split(":")[2]!;
}
export function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}