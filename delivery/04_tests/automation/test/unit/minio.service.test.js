const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { after, before, beforeEach, describe, it } = require('node:test');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const servicePath = path.join(workspaceRoot, 'backend', 'dist', 'modules', 'storage', 'minio.service.js');
const originalCwd = process.cwd();
const originalStorageBackend = process.env.STORAGE_BACKEND;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'videoplayer-unit-'));

let MinioService;
let LOCAL_STORAGE_ROOT;
let getStorageMode;

class MockMinioClient {
  static instances = [];

  constructor(options) {
    this.options = options;
    this.bucketExists = async () => true;
    this.makeBucketCalls = [];
    this.setBucketPolicyCalls = [];
    this.putObjectCalls = [];
    this.fPutObjectCalls = [];
    this.fGetObjectCalls = [];
    this.removeObjectCalls = [];
    MockMinioClient.instances.push(this);
  }

  async makeBucket(...args) {
    this.makeBucketCalls.push(args);
  }

  async setBucketPolicy(...args) {
    this.setBucketPolicyCalls.push(args);
  }

  async putObject(...args) {
    this.putObjectCalls.push(args);
  }

  async fPutObject(...args) {
    this.fPutObjectCalls.push(args);
  }

  async fGetObject(...args) {
    this.fGetObjectCalls.push(args);
  }

  async removeObject(...args) {
    this.removeObjectCalls.push(args);
  }
}

function installMinioMock() {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'minio') {
      return { Client: MockMinioClient };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  return () => {
    Module._load = originalLoad;
  };
}

function makeConfig(values = {}) {
  return {
    get(key, defaultValue) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue;
    },
  };
}

function resetStorageRoot() {
  fs.rmSync(LOCAL_STORAGE_ROOT, { recursive: true, force: true });
}

before(() => {
  process.chdir(tempRoot);
  const uninstallMinioMock = installMinioMock();
  ({ MinioService, LOCAL_STORAGE_ROOT, getStorageMode } = require(servicePath));
  uninstallMinioMock();
});

beforeEach(() => {
  MockMinioClient.instances = [];
  resetStorageRoot();
  process.env.STORAGE_BACKEND = 'minio';
});

after(() => {
  process.chdir(originalCwd);
  if (originalStorageBackend === undefined) {
    delete process.env.STORAGE_BACKEND;
  } else {
    process.env.STORAGE_BACKEND = originalStorageBackend;
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe('MinioService storage mode and configuration', () => {
  it('uses minio mode by default and creates a MinIO client from configuration', () => {
    delete process.env.STORAGE_BACKEND;

    const service = new MinioService(
      makeConfig({
        MINIO_ENDPOINT: 'storage.example.test',
        MINIO_PORT: '9443',
        MINIO_USE_SSL: 'true',
        MINIO_ROOT_USER: 'tester',
        MINIO_ROOT_PASSWORD: 'secret',
        MINIO_BUCKET: 'videos',
      }),
    );

    assert.equal(getStorageMode(), 'minio');
    assert.equal(service.getStorageMode(), 'minio');
    assert.equal(MockMinioClient.instances.length, 1);
    assert.deepEqual(MockMinioClient.instances[0].options, {
      endPoint: 'storage.example.test',
      port: 9443,
      useSSL: true,
      accessKey: 'tester',
      secretKey: 'secret',
    });
  });

  it('uses an explicit public base url when one is configured', async () => {
    const service = new MinioService(
      makeConfig({
        MINIO_BUCKET: 'video-bucket',
        MINIO_PUBLIC_BASE_URL: 'https://cdn.example.test',
      }),
    );

    const result = await service.uploadObject({
      objectKey: 'covers/demo.png',
      buffer: Buffer.from('image'),
      size: 5,
      mimeType: 'image/png',
    });

    assert.deepEqual(result, {
      bucket: 'video-bucket',
      objectKey: 'covers/demo.png',
      url: 'https://cdn.example.test/video-bucket/covers/demo.png',
    });
  });
});

describe('MinioService bucket initialization', () => {
  it('does not create a bucket when it already exists', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'existing-bucket' }));
    const client = MockMinioClient.instances[0];
    client.bucketExists = async (bucket) => {
      assert.equal(bucket, 'existing-bucket');
      return true;
    };

    await service.onModuleInit();

    assert.equal(client.makeBucketCalls.length, 0);
    assert.equal(client.setBucketPolicyCalls.length, 0);
    assert.equal(service.getStorageMode(), 'minio');
  });

  it('creates a missing bucket and configures public read policy', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'new-bucket' }));
    const client = MockMinioClient.instances[0];
    client.bucketExists = async () => false;

    await service.onModuleInit();

    assert.deepEqual(client.makeBucketCalls, [['new-bucket', 'us-east-1']]);
    assert.equal(client.setBucketPolicyCalls.length, 1);
    assert.equal(client.setBucketPolicyCalls[0][0], 'new-bucket');
    assert.match(client.setBucketPolicyCalls[0][1], /arn:aws:s3:::new-bucket\/\*/);
  });

  it('falls back to local storage when MinIO initialization fails', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'broken-bucket' }));
    const client = MockMinioClient.instances[0];
    client.bucketExists = async () => false;
    client.makeBucket = async () => {
      throw new Error('network down');
    };

    await service.onModuleInit();

    assert.equal(service.getStorageMode(), 'local');
    assert.equal(fs.existsSync(LOCAL_STORAGE_ROOT), true);
  });

  it('creates local storage root without constructing a MinIO client in local mode', async () => {
    process.env.STORAGE_BACKEND = 'local';
    const service = new MinioService(makeConfig());

    await service.onModuleInit();

    assert.equal(MockMinioClient.instances.length, 0);
    assert.equal(service.getStorageMode(), 'local');
    assert.equal(fs.existsSync(LOCAL_STORAGE_ROOT), true);
  });
});

describe('MinioService MinIO object operations', () => {
  it('uploads a buffer object with bucket, key, size and content type', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'uploads' }));
    const client = MockMinioClient.instances[0];
    const buffer = Buffer.from('hello');

    const result = await service.uploadObject({
      objectKey: 'videos/a.txt',
      buffer,
      size: buffer.length,
      mimeType: 'text/plain',
    });

    assert.equal(client.putObjectCalls.length, 1);
    assert.deepEqual(client.putObjectCalls[0], [
      'uploads',
      'videos/a.txt',
      buffer,
      5,
      { 'Content-Type': 'text/plain' },
    ]);
    assert.deepEqual(result, {
      bucket: 'uploads',
      objectKey: 'videos/a.txt',
      url: 'http://127.0.0.1:9000/uploads/videos/a.txt',
    });
  });

  it('uploads a file path through fPutObject and returns the public url', async () => {
    const filePath = path.join(tempRoot, 'source.txt');
    fs.writeFileSync(filePath, 'content');
    const service = new MinioService(makeConfig());
    const client = MockMinioClient.instances[0];

    const url = await service.uploadFile('custom-bucket', 'docs/source.txt', filePath, 'text/plain');

    assert.equal(url, 'http://127.0.0.1:9000/custom-bucket/docs/source.txt');
    assert.deepEqual(client.fPutObjectCalls, [
      ['custom-bucket', 'docs/source.txt', filePath, { 'Content-Type': 'text/plain' }],
    ]);
  });

  it('uploads a file stream with detected file size', async () => {
    const filePath = path.join(tempRoot, 'movie.bin');
    fs.writeFileSync(filePath, Buffer.from([1, 2, 3, 4]));
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'media' }));
    const client = MockMinioClient.instances[0];

    const result = await service.uploadFileFromPath({
      objectKey: 'raw/movie.bin',
      filePath,
      mimeType: 'application/octet-stream',
    });

    assert.equal(client.putObjectCalls.length, 1);
    assert.equal(client.putObjectCalls[0][0], 'media');
    assert.equal(client.putObjectCalls[0][1], 'raw/movie.bin');
    assert.equal(client.putObjectCalls[0][3], 4);
    assert.deepEqual(client.putObjectCalls[0][4], { 'Content-Type': 'application/octet-stream' });
    assert.deepEqual(result, {
      bucket: 'media',
      objectKey: 'raw/movie.bin',
      url: 'http://127.0.0.1:9000/media/raw/movie.bin',
      size: 4,
    });
  });

  it('downloads and deletes objects through the MinIO client', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'media' }));
    const client = MockMinioClient.instances[0];
    const targetPath = path.join(tempRoot, 'downloaded.txt');

    const downloaded = await service.downloadObjectToFile('docs/a.txt', targetPath);
    await service.deleteFile('media', 'docs/a.txt');

    assert.equal(downloaded, targetPath);
    assert.deepEqual(client.fGetObjectCalls, [['media', 'docs/a.txt', targetPath]]);
    assert.deepEqual(client.removeObjectCalls, [['media', 'docs/a.txt']]);
  });
});

describe('MinioService local storage operations', () => {
  beforeEach(() => {
    process.env.STORAGE_BACKEND = 'local';
  });

  it('writes buffer uploads to local storage and returns a local access path', async () => {
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'local-bucket' }));
    const result = await service.uploadObject({
      objectKey: 'nested/video.txt',
      buffer: Buffer.from('local video'),
      size: 11,
      mimeType: 'text/plain',
    });
    const writtenPath = path.join(LOCAL_STORAGE_ROOT, 'nested', 'video.txt');

    assert.equal(fs.readFileSync(writtenPath, 'utf8'), 'local video');
    assert.deepEqual(result, {
      bucket: 'local-bucket',
      objectKey: 'nested/video.txt',
      url: '/storage/nested/video.txt',
    });
  });

  it('copies uploaded files to local storage and includes the detected size', async () => {
    const filePath = path.join(tempRoot, 'clip.txt');
    fs.writeFileSync(filePath, 'clip-data');
    const service = new MinioService(makeConfig({ MINIO_BUCKET: 'local-bucket' }));

    const result = await service.uploadFileFromPath({
      objectKey: 'clips/clip.txt',
      filePath,
      mimeType: 'text/plain',
    });

    assert.equal(fs.readFileSync(path.join(LOCAL_STORAGE_ROOT, 'clips', 'clip.txt'), 'utf8'), 'clip-data');
    assert.deepEqual(result, {
      bucket: 'local-bucket',
      objectKey: 'clips/clip.txt',
      url: '/storage/clips/clip.txt',
      size: 9,
    });
  });

  it('copies local objects to the requested download target', async () => {
    const sourcePath = path.join(LOCAL_STORAGE_ROOT, 'videos', 'source.txt');
    const targetPath = path.join(tempRoot, 'downloads', 'target.txt');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, 'download me');
    const service = new MinioService(makeConfig());

    const result = await service.downloadObjectToFile('videos/source.txt', targetPath);

    assert.equal(result, targetPath);
    assert.equal(fs.readFileSync(targetPath, 'utf8'), 'download me');
  });

  it('deletes an existing local file and treats a missing file as successful', async () => {
    const filePath = path.join(LOCAL_STORAGE_ROOT, 'to-delete.txt');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'remove');
    const service = new MinioService(makeConfig());

    await service.deleteFile('ignored-bucket', 'to-delete.txt');
    await service.deleteFile('ignored-bucket', 'to-delete.txt');

    assert.equal(fs.existsSync(filePath), false);
  });
});
