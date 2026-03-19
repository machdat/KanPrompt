/**
 * CC Live Runner: Live-Output + Interactive Resume
 *
 * Phase 1: claude -p --output-format stream-json --verbose (live im Terminal)
 * Phase 2: Neues wt.exe Terminal mit claude --resume SESSION_ID
 *
 * Usage: node cc-live-runner.js [config.json]
 *
 * Config-Format:
 *   { prompt, cwd, allowedTools?, interactive? }
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Config lesen ──
const configPath = process.argv[2];
if (!configPath) {
  console.error('  Fehler: Config-Pfad als Argument erforderlich.');
  console.error('  Usage: node cc-live-runner.js <config.json>');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('  Fehler: Config nicht lesbar: ' + configPath);
  process.exit(1);
}

const prompt = config.prompt;
if (!prompt) {
  console.error('  Fehler: "prompt" fehlt in Config.');
  process.exit(1);
}

const cwd = config.cwd || process.cwd();
const allowedTools = config.allowedTools || 'Read,Write,Edit';
const interactive = config.interactive !== false; // default: true

console.log('');
console.log('  \x1b[36m=== CC Live Runner ===\x1b[0m');
console.log('  Verzeichnis: ' + cwd);
console.log('  Prompt:      ' + prompt.substring(0, 80) + (prompt.length > 80 ? '...' : ''));
console.log('  Tools:       ' + allowedTools);
console.log('  Interaktiv:  ' + (interactive ? 'ja (resume nach Abschluss)' : 'nein'));
console.log('');

// ── Phase 1: claude -p mit stream-json + --verbose ──
const cmd = `claude -p ${JSON.stringify(prompt)} --allowedTools "${allowedTools}" --output-format stream-json --verbose`;
const startTime = Date.now();
const cc = exec(cmd, { cwd, maxBuffer: 50 * 1024 * 1024 });

let sessionId = null;
let buffer = '';

cc.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const evt = JSON.parse(line);

      if (evt.session_id) sessionId = evt.session_id;

      if (evt.type === 'assistant' && evt.message?.content) {
        for (const block of evt.message.content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write('\x1b[97m' + block.text + '\x1b[0m');
          }
          if (block.type === 'tool_use') {
            const info = block.input?.command
              ? block.input.command.substring(0, 80)
              : block.input?.file_path || block.input?.pattern || '';
            console.log('\x1b[33m  >> ' + block.name + (info ? ': ' + info : '') + '\x1b[0m');
          }
        }
      }

      if (evt.type === 'result') {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('');
        console.log('\x1b[32m  === Prompt abgearbeitet ===\x1b[0m');
        console.log('\x1b[90m  Dauer: ' + elapsed + 's' +
          (evt.total_cost_usd ? ' | Kosten: $' + evt.total_cost_usd.toFixed(4) : '') +
          '\x1b[0m');
        if (evt.session_id) sessionId = evt.session_id;
      }
    } catch (e) {
      // Kein JSON — verbose debug output, ignorieren
    }
  }
});

cc.stderr.on('data', (chunk) => {
  const text = chunk.toString().trim();
  if (text && !text.includes('stdin data')) {
    console.log('\x1b[90m  ' + text + '\x1b[0m');
  }
});

cc.on('close', (code) => {
  console.log('');

  if (sessionId && interactive) {
    console.log('\x1b[36m  Session-ID: ' + sessionId + '\x1b[0m');
    console.log('');
    console.log('  Oeffne interaktive CC-Session in neuem Terminal...');

    // Phase 2: Neues Terminal mit --resume
    const wtPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'wt.exe');
    const title = config.title || 'CC Resume';
    const resumeCmd = `"${wtPath}" -d "${cwd}" --title "${title}" cmd /k "claude --resume ${sessionId}"`;

    exec(resumeCmd, (err) => {
      if (err) {
        // Fallback: kein wt.exe
        console.log('  wt.exe nicht verfuegbar. Manuell fortsetzen mit:');
        console.log('\x1b[33m  claude --resume ' + sessionId + '\x1b[0m');
      } else {
        console.log('\x1b[32m  Resume-Terminal geoeffnet.\x1b[0m');
      }
      console.log('');
    });
  } else if (sessionId) {
    console.log('\x1b[36m  Session-ID: ' + sessionId + '\x1b[0m');
    console.log('  Zum Fortsetzen: claude --resume ' + sessionId);
    console.log('');
  } else {
    console.log('  Exit-Code: ' + code);
    console.log('');
  }

  // Config-Datei aufraeumen
  try { fs.unlinkSync(configPath); } catch {}
});
