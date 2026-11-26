import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('../.github/scripts/verify-release-ref.sh', import.meta.url));

test('only the triggering commit of an existing strict tag reachable from main passes', t => {
  // Use a disposable, local Git fixture as the remote. No project refs are changed.
  const fixture = mkdtempSync(join(tmpdir(), 'serve-release-test-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const remote = join(fixture, 'remote');
  const checkout = join(fixture, 'checkout');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(fixture, 'init', '-q', '-b', 'main', remote);
  git(remote, 'config', 'user.name', 'Release Test');
  git(remote, 'config', 'user.email', 'release-test@example.invalid');
  git(remote, 'commit', '-qm', 'first reviewed commit', '--allow-empty');
  const reviewed = git(remote, 'rev-parse', 'HEAD');
  git(remote, 'commit', '-qm', 'second reviewed commit', '--allow-empty');
  const main = git(remote, 'rev-parse', 'HEAD');
  git(remote, 'tag', '-a', 'v1.2.3', reviewed, '-m', 'fixture annotated tag');
  const tagObject = git(remote, 'rev-parse', 'refs/tags/v1.2.3');
  git(remote, 'tag', 'v2.0.0', main);
  git(remote, 'switch', '-qc', 'unreviewed');
  git(remote, 'commit', '-qm', 'unreviewed commit', '--allow-empty');
  const unreviewed = git(remote, 'rev-parse', 'HEAD');
  git(remote, 'tag', 'v3.0.0', unreviewed);
  git(remote, 'switch', '-q', 'main');
  git(fixture, 'clone', '-q', remote, checkout);

  const check = (ref, sha) => spawnSync('bash', [script, ref, sha], { cwd: checkout, encoding: 'utf8' });
  for (const sha of [reviewed, tagObject]) {
    const valid = check('refs/tags/v1.2.3', sha);
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(valid.stdout, 'version=1.2.3\ncommit=' + reviewed + '\n');
  }
  assert.equal(check('refs/tags/v2.0.0', main).status, 0);

  for (const invalid of ['refs/heads/main', 'refs/tags/v1.2', 'refs/tags/v1.02.3', 'refs/tags/v1.2.3-beta', 'refs/tags/v1.2.3\n']) {
    assert.match(check(invalid, main).stderr, /Release tags must look like/);
  }
  const outsideMain = check('refs/tags/v3.0.0', unreviewed);
  assert.equal(outsideMain.status, 1);
  assert.match(outsideMain.stderr, /must be reachable from main/);
  git(remote, 'tag', '-f', 'v1.2.3', main);
  assert.match(check('refs/tags/v1.2.3', reviewed).stderr, /no longer matches/);
  git(remote, 'tag', '-d', 'v1.2.3');
  const deleted = check('refs/tags/v1.2.3', reviewed);
  assert.notEqual(deleted.status, 0);
  assert.equal(deleted.stdout, '');
});
