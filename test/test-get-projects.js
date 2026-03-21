const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getProjectsFromRegistry } = require('../companion/project-utils');

// Fake fs module for testing
function fakeFs(existingPaths) {
  return {
    existsSync(p) { return existingPaths.includes(p); }
  };
}

describe('getProjectsFromRegistry', () => {

  it('1. Leere Registry → leere Liste', () => {
    const result = getProjectsFromRegistry({ projects: {} }, fakeFs([]));
    assert.deepStrictEqual(result, []);
  });

  it('2. Gültiger Pfad → name, path, kein error', () => {
    const registry = {
      projects: {
        'my-project': { projectPath: 'C:\\git\\my-project' }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs(['C:\\git\\my-project']));
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'my-project');
    assert.equal(result[0].path, 'C:\\git\\my-project');
    assert.equal(result[0].error, undefined);
  });

  it('3. Nicht-existenter Pfad → error-Feld gesetzt', () => {
    const registry = {
      projects: {
        'gone': { projectPath: 'C:\\gone\\project' }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs([]));
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'gone');
    assert.ok(result[0].error);
    assert.ok(result[0].error.includes('Pfad existiert nicht'));
  });

  it('4. Mix gültig/ungültig → korrekt getrennt', () => {
    const registry = {
      projects: {
        'valid': { projectPath: 'C:\\valid' },
        'invalid': { projectPath: 'C:\\invalid' }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs(['C:\\valid']));
    assert.equal(result.length, 2);

    const valid = result.find(p => p.name === 'valid');
    const invalid = result.find(p => p.name === 'invalid');
    assert.equal(valid.error, undefined);
    assert.ok(invalid.error);
  });

  it('5. Projekt ohne projectPath (null) → error', () => {
    const registry = {
      projects: {
        'broken': { projectPath: null }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs([]));
    assert.equal(result.length, 1);
    assert.ok(result[0].error);
    assert.ok(result[0].error.includes('Kein Projektpfad'));
  });

  it('6. Ungültiger Pfad wird nicht still übersprungen', () => {
    const registry = {
      projects: {
        'a': { projectPath: 'C:\\exists' },
        'b': { projectPath: 'C:\\missing' },
        'c': { projectPath: 'C:\\also-exists' }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs(['C:\\exists', 'C:\\also-exists']));
    assert.equal(result.length, 3, 'Alle 3 Projekte müssen in der Liste sein');
    const missing = result.find(p => p.name === 'b');
    assert.ok(missing, 'Projekt b darf nicht übersprungen werden');
    assert.ok(missing.error);
  });

  it('7. Reihenfolge entspricht Registry-Reihenfolge', () => {
    const registry = {
      projects: {
        'alpha': { projectPath: 'C:\\alpha' },
        'beta': { projectPath: 'C:\\beta' },
        'gamma': { projectPath: 'C:\\gamma' }
      }
    };
    const result = getProjectsFromRegistry(registry, fakeFs(['C:\\alpha', 'C:\\beta', 'C:\\gamma']));
    assert.deepStrictEqual(result.map(p => p.name), ['alpha', 'beta', 'gamma']);
  });

});
