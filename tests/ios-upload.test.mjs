import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { buildNumber, individualToken, uploadBuild } from '../.github/scripts/ios-upload.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const key = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64');
const keyId = 'ABCD123456XY';
const decode = value => JSON.parse(Buffer.from(value, 'base64url'));

test('signs an Apple individual JWT with its complete 12-character key ID', () => {
  const [header, payload, signature] = individualToken(key, keyId, 1000).split('.');
  assert.deepEqual(decode(header), { alg: 'ES256', kid: keyId, typ: 'JWT' });
  assert.deepEqual(decode(payload), { sub: 'user', aud: 'appstoreconnect-v1', iat: 1000, exp: 1300 });
  assert.equal(Buffer.from(signature, 'base64url').length, 64);
  assert(verify('sha256', Buffer.from(header + '.' + payload),
    { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')));
});

test('rejects malformed individual IDs, key encoding, and curve', () => {
  for (const invalid of [undefined, '', 'ABCD123456', 'ABCD123456X!', 'ABCD123456XY\n', 'abcd123456xy']) {
    assert.throws(() => individualToken(key, invalid), /individual key configuration/);
  }
  for (const invalid of ['!', key + '!', Buffer.from('not a key').toString('base64')]) {
    assert.throws(() => individualToken(invalid, keyId), /base64-encoded private key/);
  }
  const other = generateKeyPairSync('ec', { namedCurve: 'P-384' }).privateKey;
  const wrongCurve = Buffer.from(other.export({ type: 'pkcs8', format: 'pem' })).toString('base64');
  assert.throws(() => individualToken(wrongCurve, keyId), /P-256/);
});

test('allocates distinct increasing build numbers for runs and retries', () => {
  assert.deepEqual([buildNumber('1', '1'), buildNumber('1', '2'), buildNumber('2', '1')],
    ['1.10.1', '1.10.2', '1.20.1']);
  assert.throws(() => buildNumber('01', '1'), /build-number range/);
  assert.throws(() => buildNumber('1', '1000'), /build-number range/);
});

function mockApple({ bundleId = 'org.5913.321serve', brokenRange = false, state = 'UPLOAD_COMPLETE' } = {}) {
  const calls = [];
  const api = 'https://api.appstoreconnect.apple.com/v1/';
  const asset = 'https://delivery.example/';
  const operation = (offset, length) => ({
    offset, length, method: 'PUT', url: asset + offset,
    requestHeaders: [{ name: 'x-upload-header', value: 'required' }],
  });
  const fetch = async (url, options) => {
    calls.push([url, options]);
    if (url.startsWith(asset)) return new Response(null, { status: 200 });
    assert.equal(options.headers.Authorization.split(' ')[0], 'Bearer');
    const resource = new URL(url).pathname;
    if (resource === '/v1/apps') return Response.json({ data: [{ id: '123', attributes: { bundleId } }] });
    if (url === api + 'buildUploads') return Response.json({ data: { id: 'upload-1' } });
    if (url === api + 'buildUploadFiles') return Response.json({
      data: { id: 'file-1', attributes: { uploadOperations: [
        operation(brokenRange ? 3 : 2, 2), operation(0, 2),
      ] } },
    });
    if (url === api + 'buildUploadFiles/file-1') return Response.json({
      data: { attributes: { assetDeliveryState: { state } } },
    });
    throw new Error('Unexpected endpoint');
  };
  return { calls, fetch };
}

const upload = fetch => uploadBuild({
  key, keyId, ipa: Buffer.from('abcd'), version: '1.0.0', build: '1.10.1', fetch,
});

test('reserves, uploads the IPA byte ranges, and commits through the Apple API', async () => {
  const { calls, fetch } = mockApple();
  assert.equal(await upload(fetch), 'upload-1');
  assert.deepEqual(calls.map(([, options]) => options.method), ['GET', 'POST', 'POST', 'PUT', 'PUT', 'PATCH']);
  assert.deepEqual(JSON.parse(calls[1][1].body).data.attributes,
    { platform: 'IOS', cfBundleShortVersionString: '1.0.0', cfBundleVersion: '1.10.1' });
  assert.deepEqual(JSON.parse(calls[2][1].body).data.attributes,
    { fileName: '321-Serve.ipa', fileSize: 4, assetType: 'ASSET', uti: 'com.apple.ipa' });
  assert.equal(calls[3][1].body.toString(), 'ab');
  assert.equal(calls[4][1].body.toString(), 'cd');
  assert.equal(calls[3][1].headers.get('x-upload-header'), 'required');
  assert.equal(calls[3][1].headers.has('authorization'), false);
  assert.deepEqual(JSON.parse(calls[5][1].body).data.attributes, { uploaded: true });
});

test('stops for a mismatched app, incomplete upload range or unconfirmed commit', async () => {
  const wrongApp = mockApple({ bundleId: 'org.example.other' });
  await assert.rejects(upload(wrongApp.fetch), /exactly one app/);
  assert.equal(wrongApp.calls.length, 1);

  const broken = mockApple({ brokenRange: true });
  await assert.rejects(upload(broken.fetch), /byte ranges/);
  assert.equal(broken.calls.length, 3);

  await assert.rejects(upload(mockApple({ state: 'FAILED' }).fetch), /did not confirm/);
});
