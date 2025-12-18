import type { PrimitivesRegistry, PrimitiveCore } from "./types.js";

let DEFAULT_BASE =
  process.env.MANDATE_SPECS_BASE_URL ??
  "https://raw.githubusercontent.com/quillai-network/mandate-specs/main/spec";

export function setPrimitivesBaseUrl(url: string) {
  DEFAULT_BASE = url.replace(/\/+$/, "");
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

let _registryCache: { baseUrl: string; value: PrimitivesRegistry } | null = null;
const _schemaCache = new Map<string, unknown>();

export async function fetchRegistry(baseUrl: string = DEFAULT_BASE): Promise<PrimitivesRegistry> {
  const base = baseUrl.replace(/\/+$/, "");
  if (_registryCache?.baseUrl === base) return _registryCache.value;

  const url = joinUrl(base, "primitives/registry.json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch registry: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as PrimitivesRegistry;

  _registryCache = { baseUrl: base, value: json };
  return json;
}

export async function fetchPrimitiveSchema<TSchema = any>(
  kind: string,
  baseUrl: string = DEFAULT_BASE
): Promise<TSchema> {
  const base = baseUrl.replace(/\/+$/, "");
  const cacheKey = `${base}::${kind}`;
  if (_schemaCache.has(cacheKey)) return _schemaCache.get(cacheKey) as TSchema;

  const registry = await fetchRegistry(base);
  const entry = registry.primitives.find((p) => p.kind === kind);
  if (!entry) throw new Error(`Primitive kind '${kind}' not found in registry`);

  const url = joinUrl(base, entry.schemaPath);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch schema for ${kind}: ${res.status} ${res.statusText}`);

  const schema = (await res.json()) as TSchema;
  _schemaCache.set(cacheKey, schema);
  return schema;
}

export async function buildCore<TPayload extends Record<string, unknown>>(
  kind: string,
  payload: TPayload,
  baseUrl: string = DEFAULT_BASE
): Promise<PrimitiveCore<TPayload>> {
  // minimal check: ensure kind exists in registry
  await fetchPrimitiveSchema(kind, baseUrl);
  return { kind, payload };
}
