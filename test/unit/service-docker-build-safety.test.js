const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const prismaServices = ['identity-community', 'content-media', 'live-reward', 'governance-ai'];

test('Prisma service image builds have bounded retry attempts', () => {
  for (const service of prismaServices) {
    const dockerfile = fs.readFileSync(path.join(root, 'services', service, 'Dockerfile'), 'utf8');
    assert.match(dockerfile, /ARG SERVICE_BUILD_ATTEMPT_TIMEOUT=300s/);
    assert.match(dockerfile, /for attempt in 1 2 3 4 5/);
    assert.match(dockerfile, /timeout --signal=TERM --kill-after=30s "\$SERVICE_BUILD_ATTEMPT_TIMEOUT"/);
    assert.match(dockerfile, new RegExp(`npm --workspace @videoplayer/${service} run build`));
    assert.match(dockerfile, /failed or timed out with exit \$\{status\}; retrying/);
  }
});
