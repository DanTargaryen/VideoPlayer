const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException } = require('@nestjs/common');

const { MediaProxyController } = require('../../backend/dist/modules/media-proxy/media-proxy.controller.js');

function makeConfig(values = {}) {
  return {
    get(key) {
      return values[key];
    },
  };
}

describe('MediaProxyController URL and header rules', () => {
  it('accepts only http or https URLs from allowed hosts', () => {
    const controller = new MediaProxyController(
      makeConfig({
        MINIO_PUBLIC_BASE_URL: 'https://cdn.example.test/base',
        MEDIA_PROXY_ALLOWED_HOSTS: 'media.example.test, static.example.test',
      }),
    );

    assert.equal(controller.parseAllowedUrl('https://cdn.example.test/base/video.mp4').host, 'cdn.example.test');
    assert.equal(controller.parseAllowedUrl('http://media.example.test/video.mp4').host, 'media.example.test');
    assert.throws(() => controller.parseAllowedUrl('ftp://media.example.test/video.mp4'), BadRequestException);
    assert.throws(() => controller.parseAllowedUrl('https://evil.example.test/video.mp4'), BadRequestException);
    assert.throws(() => controller.parseAllowedUrl('not-a-url'), BadRequestException);
  });

  it('copies only media-related response headers', () => {
    const controller = new MediaProxyController(makeConfig());
    const copied = {};
    const upstream = {
      headers: {
        get(name) {
          return {
            'content-type': 'video/mp4',
            'content-length': '123',
            server: 'hidden',
          }[name];
        },
      },
    };
    const response = {
      setHeader(name, value) {
        copied[name] = value;
      },
    };

    controller.copyHeaders(upstream, response);

    assert.deepEqual(copied, {
      'content-length': '123',
      'content-type': 'video/mp4',
    });
  });
});
