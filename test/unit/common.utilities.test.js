const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { ok } = require('../../backend/dist/common/dto/api-response.dto.js');
const {
  CATEGORY_CODE_TO_ID,
  CATEGORY_DEFINITIONS,
  VIDEO_CATEGORY_CODES,
  resolveCategoryCode,
  resolveCategoryId,
} = require('../../backend/dist/common/constants/categories.js');
const {
  getPrismaErrorCode,
  getPrismaErrorMessage,
  isTransientPrismaError,
} = require('../../backend/dist/common/prisma/transient-prisma-error.js');
const { searchSiteHelpKnowledge } = require('../../backend/dist/modules/assistant/constants/site-help-knowledge.js');

describe('common api response helper', () => {
  it('wraps data in a standard success response', () => {
    assert.deepEqual(ok({ id: 1 }), {
      code: 0,
      message: 'ok',
      data: { id: 1 },
    });
    assert.deepEqual(ok(null, 'created'), {
      code: 0,
      message: 'created',
      data: null,
    });
  });
});

describe('video category constants', () => {
  it('maps valid category codes to ids and filters non-specific categories', () => {
    assert.equal(resolveCategoryId('entertainment'), 1);
    assert.equal(resolveCategoryId('travel'), 13);
    assert.equal(resolveCategoryId('recommend'), undefined);
    assert.equal(resolveCategoryId(undefined), undefined);
    assert.equal(resolveCategoryId('unknown'), undefined);
  });

  it('resolves only declared category codes', () => {
    assert.equal(resolveCategoryCode('tech'), 'tech');
    assert.equal(resolveCategoryCode('recommend'), undefined);
    assert.equal(resolveCategoryCode('unknown'), undefined);
  });

  it('keeps category definitions and video category codes consistent', () => {
    const ids = Object.values(CATEGORY_CODE_TO_ID);
    assert.equal(new Set(ids).size, ids.length);

    for (const code of VIDEO_CATEGORY_CODES) {
      assert.equal(typeof CATEGORY_CODE_TO_ID[code], 'number');
      assert.equal(CATEGORY_DEFINITIONS.some((item) => item.code === code), true);
    }

    assert.equal(CATEGORY_DEFINITIONS.find((item) => item.code === 'recommend').id, null);
  });
});

describe('transient prisma error helper', () => {
  it('extracts prisma error code and message from supported shapes', () => {
    const error = new Error('connection refused');
    error.errorCode = 'P1001';

    assert.equal(getPrismaErrorCode(error), 'P1001');
    assert.equal(getPrismaErrorMessage(error), 'connection refused');
    assert.equal(getPrismaErrorMessage('timeout'), 'timeout');
  });

  it('recognizes transient database errors by code or message', () => {
    assert.equal(isTransientPrismaError({ code: 'P1001' }), true);
    assert.equal(isTransientPrismaError(new Error('server has closed the connection')), true);
    assert.equal(isTransientPrismaError(new Error('validation failed')), false);
  });
});

describe('site help knowledge search', () => {
  it('returns no help entries for blank query', () => {
    assert.deepEqual(searchSiteHelpKnowledge('   '), []);
  });

  it('returns scored matches and respects the limit', () => {
    const result = searchSiteHelpKnowledge('/upload', 1);

    assert.equal(result.length, 1);
    assert.equal(result[0].score > 0, true);
    assert.equal(typeof result[0].item.id, 'string');
    assert.equal(typeof result[0].item.title, 'string');
  });
});
