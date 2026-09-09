import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverTargets, parseGitHubBrowseUrl } from '../src/discovery.js';

async function makeArtifactFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tripwire-git-fixture-'));
  await mkdir(path.join(root, 'skills', 'foo'), { recursive: true });
  await mkdir(path.join(root, 'mcp', 'bar'), { recursive: true });
  await writeFile(path.join(root, 'skills', 'foo', 'SKILL.md'), '# foo');
  await writeFile(path.join(root, 'mcp', 'bar', 'server.py'), '# mcp');
  return root;
}

function cloneFixtureInto(fixture, cloneCalls) {
  return async (cloneUrl, destDir) => {
    cloneCalls.push({ cloneUrl, destDir });
    await cp(fixture, destDir, { recursive: true });
  };
}

test('GWT-62.1: browse URL parses to clean clone URL and scopes discovery', async () => {
  const fixture = await makeArtifactFixture();
  const cloneCalls = [];
  const browseUrl = 'https://github.com/org/repo/tree/main/skills/';

  try {
    const parsed = parseGitHubBrowseUrl(browseUrl);
    const targets = await discoverTargets({
      targets: [browseUrl],
      useDefaults: false,
      cloneRepoFn: cloneFixtureInto(fixture, cloneCalls),
    });

    assert.deepEqual(parsed, {
      cloneUrl: 'https://github.com/org/repo',
      org: 'org',
      repo: 'repo',
      scopePath: 'skills',
    }, 'browse URL should separate its cloneable repository and scope');
    assert.equal(cloneCalls[0].cloneUrl, 'https://github.com/org/repo',
      'clone must not receive the GitHub browse path');
    assert.equal(targets.length, 1, 'scope should only return artifacts beneath skills/');
    assert.equal(targets[0].type, 'skill', 'scoped artifact should retain its type');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('GWT-62.2: GitHub root URL fans out typed artifacts with repo identifiers', async () => {
  const fixture = await makeArtifactFixture();

  try {
    const targets = await discoverTargets({
      targets: ['https://github.com/org/repo'],
      useDefaults: false,
      cloneRepoFn: cloneFixtureInto(fixture, []),
    });

    assert.ok(targets.some(target => target.type === 'skill'),
      'repository root should discover its skill');
    assert.ok(targets.some(target => target.type === 'mcp_server'),
      'repository root should discover its MCP server');
    assert.ok(targets.every(target => target.identifier.startsWith('org/repo/')),
      'each artifact identifier should retain its org/repo namespace');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('GWT-62.6: GitHub repository without artifacts returns no targets', async () => {
  const emptyFixture = await mkdtemp(path.join(os.tmpdir(), 'tripwire-empty-git-fixture-'));

  try {
    const targets = await discoverTargets({
      targets: ['https://github.com/org/repo'],
      useDefaults: false,
      cloneRepoFn: cloneFixtureInto(emptyFixture, []),
    });

    assert.deepEqual(targets, [], 'empty repositories must not become a misleading scan target');
  } finally {
    await rm(emptyFixture, { recursive: true, force: true });
  }
});

test('GWT-62.1: .git suffix is stripped from repository name', () => {
  const parsed = parseGitHubBrowseUrl('https://github.com/org/repo.git');
  assert.deepEqual(parsed, {
    cloneUrl: 'https://github.com/org/repo',
    org: 'org',
    repo: 'repo',
    scopePath: null,
  });
});

test('walkArtifacts: skill with package.json is not also an MCP', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tripwire-skill-pkg-'));
  try {
    await mkdir(path.join(root, 'skills', 'tool'), { recursive: true });
    await writeFile(path.join(root, 'skills', 'tool', 'SKILL.md'), '# tool');
    await writeFile(path.join(root, 'skills', 'tool', 'package.json'), '{}');
    await writeFile(path.join(root, 'package.json'), '{}');
    await mkdir(path.join(root, 'apps', 'only-pkg'), { recursive: true });
    await writeFile(path.join(root, 'apps', 'only-pkg', 'package.json'), '{}');
    await mkdir(path.join(root, 'mcp', 'real'), { recursive: true });
    await writeFile(path.join(root, 'mcp', 'real', 'server.py'), '# mcp');

    const { walkArtifacts } = await import('../src/discovery.js');
    const artifacts = await walkArtifacts(root);
    const byBase = artifacts.map(a => ({ type: a.type, base: path.basename(a.target) }))
      .sort((a, b) => a.base.localeCompare(b.base));

    assert.deepEqual(
      byBase,
      [
        { type: 'mcp_server', base: 'real' },
        { type: 'skill', base: 'tool' },
      ],
      'git walk must ignore package.json-only dirs and keep real MCP + skill roots',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('GWT-62.7: card name is skill identity, not bare GitHub repo name', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'tripwire-name-fixture-'));
  try {
    await mkdir(path.join(fixture, '.cursor', 'skills', 'impeccable'), { recursive: true });
    await mkdir(path.join(fixture, 'skills', 'audit'), { recursive: true });
    await writeFile(
      path.join(fixture, '.cursor', 'skills', 'impeccable', 'SKILL.md'),
      '---\nname: impeccable\ndescription: design skill\n---\n',
    );
    await writeFile(
      path.join(fixture, 'skills', 'audit', 'SKILL.md'),
      '---\nname: audit\ndescription: audit skill\n---\n',
    );

    const targets = await discoverTargets({
      targets: ['https://github.com/org/impeccable'],
      useDefaults: false,
      cloneRepoFn: cloneFixtureInto(fixture, []),
    });

    const byId = Object.fromEntries(targets.map(t => [t.identifier, t]));
    assert.equal(
      byId['org/impeccable/skills/audit']?.name,
      'audit',
      'distinct skill frontmatter/folder name must be the card title',
    );
    assert.equal(
      byId['org/impeccable/.cursor/skills/impeccable']?.name,
      '.cursor/skills/impeccable',
      'when skill leaf equals the GitHub repo name, card title must use the relative path',
    );
    assert.notEqual(
      byId['org/impeccable/.cursor/skills/impeccable']?.name,
      'impeccable',
      'card must not be titled with the bare repository name',
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('GWT-62.5: frontmatter name wins when it differs from folder basename', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'tripwire-fm-fixture-'));
  try {
    await mkdir(path.join(fixture, 'skills', 'folder-id'), { recursive: true });
    await writeFile(
      path.join(fixture, 'skills', 'folder-id', 'SKILL.md'),
      '---\nname: real-skill-name\ndescription: x\n---\n',
    );

    const targets = await discoverTargets({
      targets: ['https://github.com/org/other-repo'],
      useDefaults: false,
      cloneRepoFn: cloneFixtureInto(fixture, []),
    });

    assert.equal(targets.length, 1);
    assert.equal(targets[0].name, 'real-skill-name',
      'SKILL.md frontmatter name is the operator-visible skill name');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
