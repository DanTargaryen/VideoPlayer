export const RESULT_STATUSES = Object.freeze(['PASS', 'FAIL', 'BLOCKED', 'NOT RUN']);
export const UC_IDS = Object.freeze(['UC01', 'UC02', 'UC03', 'UC04', 'UC05', 'UC06']);

export function targetConfigurations(env = process.env) {
  return [
    { name: 'monolith', baseUrl: env.MONOLITH_BASE_URL?.trim() || null },
    { name: 'microservice-gateway', baseUrl: env.MICROSERVICE_GATEWAY_BASE_URL?.trim() || null },
  ];
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

async function readVersion(baseUrl, fetchImpl) {
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/version`, {
    headers: { 'x-request-id': `reg-01-version-${Date.now()}` },
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error(`version endpoint returned ${response.status}`);
  const envelope = await response.json();
  return envelope?.data ?? null;
}

async function jsonRequest(baseUrl, path, fetchImpl, options = {}) {
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${path}`, { ...options, signal: AbortSignal.timeout(5_000) });
  const envelope = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${envelope?.message ?? 'unknown error'}`);
  return envelope?.data;
}

async function runUc06(baseUrl, env, fetchImpl) {
  const reporter = await jsonRequest(baseUrl, '/api/v1/auth/login', fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: env.REG_REPORTER_ACCOUNT, password: env.REG_REPORTER_PASSWORD }),
  });
  const admin = await jsonRequest(baseUrl, '/api/v1/auth/login', fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminSecret: env.REG_ADMIN_SECRET }),
  });
  if (!reporter?.token || !admin?.token) throw new Error('UC06 login did not return both tokens');
  const report = await jsonRequest(baseUrl, '/api/v1/reports', fetchImpl, {
    method: 'POST', headers: { authorization: `Bearer ${reporter.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ targetType: 'VIDEO', targetId: env.REG_UC06_TARGET_ID || '1', reason: `REG-01 UC06 ${Date.now()}` }),
  });
  const listed = await jsonRequest(baseUrl, '/api/v1/admin/reports', fetchImpl, { headers: { authorization: `Bearer ${admin.token}` } });
  if (!Array.isArray(listed) || !listed.some((item) => item.id === report?.id && item.status === 'PENDING')) throw new Error('pending report is absent from admin queue');
  const handled = await jsonRequest(baseUrl, `/api/v1/admin/reports/${report.id}`, fetchImpl, {
    method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'KEEP', reason: 'REG-01 automated verification' }),
  });
  if ((handled?.report ?? handled)?.status !== 'REJECTED') throw new Error('report did not reach the expected terminal state');
  const duplicate = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/api/v1/admin/reports/${report.id}`, {
    method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'KEEP' }), signal: AbortSignal.timeout(5_000),
  });
  if (duplicate.status !== 409) throw new Error(`duplicate handling returned ${duplicate.status} instead of 409`);
  return { id: 'UC06', status: 'PASS', detail: `report ${report.id} handled once and duplicate rejected` };
}

export async function runRegression(options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const generatedAt = (options.now ?? new Date()).toISOString();
  const targets = [];

  for (const target of targetConfigurations(env)) {
    if (!target.baseUrl) {
      targets.push({
        ...target,
        gitSha: env.GIT_SHA?.trim() || 'unknown',
        serviceVersions: null,
        preflight: { status: 'BLOCKED', detail: 'base URL is not configured' },
        useCases: UC_IDS.map((id) => ({ id, status: 'NOT RUN' })),
      });
      continue;
    }
    try {
      const version = await readVersion(target.baseUrl, fetchImpl);
      const useCases = UC_IDS.map((id) => ({ id, status: 'NOT RUN' }));
      if (env.REG_RUN_UC06 === 'true') {
        const index = useCases.findIndex((item) => item.id === 'UC06');
        try {
          useCases[index] = await runUc06(target.baseUrl, env, fetchImpl);
        } catch (error) {
          useCases[index] = { id: 'UC06', status: 'FAIL', detail: error instanceof Error ? error.message : String(error) };
        }
      }
      targets.push({
        ...target,
        gitSha: env.GIT_SHA?.trim() || version?.version || 'unknown',
        serviceVersions: version,
        preflight: { status: 'PASS', detail: 'version endpoint reachable' },
        useCases,
      });
    } catch (error) {
      targets.push({
        ...target,
        gitSha: env.GIT_SHA?.trim() || 'unknown',
        serviceVersions: null,
        preflight: { status: 'FAIL', detail: error instanceof Error ? error.message : String(error) },
        useCases: UC_IDS.map((id) => ({ id, status: 'NOT RUN' })),
      });
    }
  }

  return {
    schemaVersion: 'reg-01/v1',
    generatedAt,
    statuses: RESULT_STATUSES,
    targets,
    note: env.REG_RUN_UC06 === 'true' ? 'UC06 executed; UC01-UC05 remain explicitly NOT RUN.' : 'Set REG_RUN_UC06=true and provide isolated credentials to execute UC06.',
  };
}
