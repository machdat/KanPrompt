/**
 * Reine Funktion: Liest Projekte aus der Registry und prüft Pfade auf Existenz.
 *
 * @param {object} registry - Registry-Objekt mit registry.projects
 * @param {object} fsModule - injiziertes fs-Modul (für Testbarkeit)
 * @returns {Array<{name: string, path: string, error?: string}>}
 */
function getProjectsFromRegistry(registry, fsModule) {
  const projects = [];
  if (!registry || !registry.projects) return projects;

  for (const [id, proj] of Object.entries(registry.projects)) {
    const entry = { name: id, path: proj && proj.projectPath ? proj.projectPath : null };

    if (!entry.path) {
      entry.error = 'Kein Projektpfad konfiguriert';
      projects.push(entry);
      continue;
    }

    try {
      if (!fsModule.existsSync(entry.path)) {
        entry.error = 'Pfad existiert nicht: ' + entry.path;
      }
    } catch (e) {
      entry.error = 'Pfad nicht prüfbar: ' + e.message;
    }

    projects.push(entry);
  }

  return projects;
}

module.exports = { getProjectsFromRegistry };
