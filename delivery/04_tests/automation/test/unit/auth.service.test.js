const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { ServiceUnavailableException, UnauthorizedException } = require('@nestjs/common');

const { AuthService } = require('../../backend/dist/modules/auth/auth.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.setImpl = (nextImpl) => {
    impl = nextImpl;
  };
  return fn;
}

function makePrisma(overrides = {}) {
  const prisma = {
    user: {
      findFirst: createMockFn(async () => null),
      create: createMockFn(async ({ data }) => ({ id: 1, ...data, bio: null })),
      update: createMockFn(async ({ where, data }) => ({ id: where.id, username: 'updated', email: 'updated@example.test', ...data })),
      findUnique: createMockFn(async ({ where }) => ({
        id: where.id,
        username: `user${where.id}`,
        email: `user${where.id}@example.test`,
        role: 'USER',
        nickname: `User ${where.id}`,
      })),
    },
    runWithTransientRetry: createMockFn(async (operation) => operation()),
  };

  return Object.assign(prisma, overrides);
}

async function assertUnauthorized(promise) {
  await assert.rejects(promise, (error) => error instanceof UnauthorizedException);
}

describe('AuthService registration', () => {
  it('registers a new user with generated email, default nickname and default favorite folder', async () => {
    const prisma = makePrisma();
    const service = new AuthService(prisma);

    const result = await service.register({
      username: 'alice',
      password: 'Secret123!',
    });

    assert.equal(prisma.user.findFirst.calls.length, 1);
    assert.deepEqual(prisma.user.findFirst.calls[0][0].where.OR, [
      { username: 'alice' },
      { email: 'user-616c696365@local.invalid' },
    ]);
    assert.equal(prisma.user.create.calls.length, 1);
    assert.equal(prisma.user.create.calls[0][0].data.coinBalance, 10);
    assert.equal(prisma.user.create.calls[0][0].data.nickname, 'alice');
    assert.equal(prisma.user.create.calls[0][0].data.favoriteFolders.create.isDefault, true);
    assert.deepEqual(result, {
      id: 1,
      username: 'alice',
      email: 'user-616c696365@local.invalid',
      role: 'USER',
      nickname: 'alice',
    });
    assert.equal(Object.hasOwn(result, 'password'), false);
  });

  it('rejects duplicate username or email without creating a user', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({ id: 99 }));
    const service = new AuthService(prisma);

    await assertUnauthorized(service.register({ username: 'alice', email: 'a@example.test', password: 'x' }));

    assert.equal(prisma.user.create.calls.length, 0);
  });
});

describe('AuthService login and admin rules', () => {
  it('requires account and password for normal login', async () => {
    const service = new AuthService(makePrisma());

    await assertUnauthorized(service.login('', '', undefined));
  });

  it('logs in a normal user and issues a token with user information', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 7,
      username: 'alice',
      email: 'alice@example.test',
      password: 'Secret123!',
      role: 'USER',
      nickname: 'Alice',
      bio: 'hello',
    }));
    const service = new AuthService(prisma);

    const result = await service.login('alice', 'Secret123!', undefined);

    assert.match(result.token, /^mock-token-7-[0-9a-f-]{36}$/);
    assert.equal(result.userId, 7);
    assert.equal(result.role, 'USER');
    assert.equal(result.nickname, 'Alice');
    assert.equal(result.email, 'alice@example.test');
  });

  it('rejects invalid password', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 7,
      username: 'alice',
      email: 'alice@example.test',
      password: 'Secret123!',
      role: 'USER',
    }));
    const service = new AuthService(prisma);

    await assertUnauthorized(service.login('alice', 'wrong', undefined));
  });

  it('requires the admin secret when an admin account logs in normally', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 1,
      username: 'admin',
      email: 'admin@example.test',
      password: 'Admin123!',
      role: 'ADMIN',
      nickname: 'Admin',
    }));
    const service = new AuthService(prisma);

    await assertUnauthorized(service.login('admin', 'Admin123!', undefined));
  });

  it('supports admin-secret-only login and creates an admin when none exists', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async ({ where }) => {
      if (where.role === 'ADMIN') {
        return null;
      }
      return null;
    });
    prisma.user.create.setImpl(async ({ data }) => ({ id: 1, ...data, bio: null }));
    const service = new AuthService(prisma);

    const result = await service.login(undefined, undefined, '123456');

    assert.equal(result.role, 'ADMIN');
    assert.match(result.token, /^mock-token-1-[0-9a-f-]{36}$/);
    assert.equal(prisma.user.create.calls[0][0].data.role, 'ADMIN');
    assert.equal(prisma.user.create.calls[0][0].data.coinBalance, 10);
  });
});

describe('AuthService current user and password reset', () => {
  it('resolves the current user from a valid bearer token', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 8,
      username: 'bob',
      email: 'bob@example.test',
      password: 'pw',
      role: 'USER',
      nickname: 'Bob',
    }));
    const service = new AuthService(prisma);
    const login = await service.login('bob', 'pw', undefined);

    const currentUser = await service.getCurrentUser(`Bearer ${login.token}`);

    assert.equal(currentUser.id, 8);
    assert.equal(prisma.runWithTransientRetry.calls.length, 1);
    assert.deepEqual(prisma.user.findUnique.calls[0][0], { where: { id: 8 } });
  });

  it('returns null for missing or malformed tokens', async () => {
    const prisma = makePrisma();
    const service = new AuthService(prisma);

    assert.equal(await service.getCurrentUser(undefined), null);
    assert.equal(await service.getCurrentUser('Bearer bad-token'), null);
    assert.equal(prisma.user.findUnique.calls.length, 0);
  });

  it('returns null from getCurrentUser on transient database errors', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 5,
      username: 'user5',
      email: 'user5@example.test',
      password: 'pw',
      role: 'USER',
    }));
    prisma.runWithTransientRetry.setImpl(async () => {
      const error = new Error('connection refused');
      error.code = 'P1001';
      throw error;
    });
    const service = new AuthService(prisma);
    const login = await service.login('user5', 'pw', undefined);

    assert.equal(await service.getCurrentUser(`Bearer ${login.token}`), null);
  });

  it('throws ServiceUnavailableException from requireUser on transient database errors', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({
      id: 6,
      username: 'user6',
      email: 'user6@example.test',
      password: 'pw',
      role: 'USER',
    }));
    prisma.runWithTransientRetry.setImpl(async () => {
      const error = new Error('timeout');
      error.code = 'P1002';
      throw error;
    });
    const service = new AuthService(prisma);
    const login = await service.login('user6', 'pw', undefined);

    await assert.rejects(service.requireUser(`Bearer ${login.token}`), (error) => error instanceof ServiceUnavailableException);
  });

  it('resets password only when username and email match', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({ id: 9, username: 'alice', email: 'alice@example.test' }));
    prisma.user.update.setImpl(async ({ where, data }) => ({ id: where.id, username: 'alice', email: 'alice@example.test', ...data }));
    const service = new AuthService(prisma);

    const result = await service.resetPasswordByEmail('alice', 'alice@example.test', 'NewPass123!');

    assert.deepEqual(prisma.user.update.calls[0][0], {
      where: { id: 9 },
      data: { password: 'NewPass123!' },
    });
    assert.deepEqual(result, {
      id: 9,
      username: 'alice',
      email: 'alice@example.test',
    });
  });
});
