export function isProductionRuntime() {
  return process.env.NODE_ENV === 'production';
}

export function isVercelRuntime() {
  return process.env.VERCEL === '1';
}

export function isMemoryModeForced() {
  return process.env.USE_MEMORY_DB === '1';
}

export function hasRedisEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function hasPersistenceEnv() {
  return Boolean(hasRedisEnv() && process.env.CODE_HASH_SECRET);
}

export function canUseMemoryMode() {
  if (isProductionRuntime()) return false;
  if (isMemoryModeForced()) return true;
  return !isVercelRuntime();
}

export function shouldAllowEphemeralFallback() {
  return !isProductionRuntime();
}

export function ensureRedisConfigured(feature: string, options?: { requireCodeHash?: boolean }) {
  const requireCodeHash = options?.requireCodeHash ?? false;
  const configured = requireCodeHash ? hasPersistenceEnv() : hasRedisEnv();
  if (!configured) {
    throw new Error(`${feature} requires Upstash Redis configuration.`);
  }
}

export function getRuntimeDiagnostics() {
  const issues: string[] = [];
  const production = isProductionRuntime();
  const memoryForced = isMemoryModeForced();
  const memoryAllowed = canUseMemoryMode();
  const redisConfigured = hasRedisEnv();
  const persistenceConfigured = hasPersistenceEnv();
  const nextAuthSecretConfigured = Boolean(process.env.NEXTAUTH_SECRET?.trim());
  const betaAccessConfigured = Boolean(process.env.BETA_ACCESS_SECRET?.trim());
  const mmoSecretConfigured = Boolean(process.env.MMO_WS_SECRET?.trim());
  const scoreSigningConfigured = Boolean(
    process.env.SCORE_SIGNING_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    (!production && process.env.CODE_HASH_SECRET?.trim()),
  );

  if (production && memoryForced) {
    issues.push('USE_MEMORY_DB=1 is not allowed in production.');
  }
  if (production && !persistenceConfigured) {
    issues.push('Redis persistence is not fully configured for production.');
  }
  if (production && !nextAuthSecretConfigured) {
    issues.push('NEXTAUTH_SECRET is required in production.');
  }
  if (production && !betaAccessConfigured) {
    issues.push('BETA_ACCESS_SECRET is required in production.');
  }
  if (production && !mmoSecretConfigured) {
    issues.push('MMO_WS_SECRET is required in production.');
  }
  if (production && !scoreSigningConfigured) {
    issues.push('Score signing secret is not configured.');
  }

  return {
    production,
    memoryForced,
    memoryAllowed,
    redisConfigured,
    persistenceConfigured,
    nextAuthSecretConfigured,
    betaAccessConfigured,
    mmoSecretConfigured,
    scoreSigningConfigured,
    issues,
    ok: issues.length === 0,
  };
}
