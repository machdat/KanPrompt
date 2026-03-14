
/*
 * CC-Prompt Workflow — Kanban Board Template v7 (Read-Only)
 *
 * Reiner Viewer. Keine Interaktion, kein State-Sync-Problem.
 * Aenderungen am Backlog laufen ueber den Chat:
 *   "Verschiebe X auf Platz Y" / "Blocke X wegen Y" / "Loesche X"
 *
 * Claude.ai ersetzt beim Generieren nur die drei DATA-Konstanten.
 * Den Rest des Codes NICHT veraendern.
 */

// BACKLOG_DATA_START
const BACKLOG_DATA = [];
// BACKLOG_DATA_END

// IN_PROGRESS_DATA_START
const IN_PROGRESS_DATA = [];
// IN_PROGRESS_DATA_END

// DONE_DATA_START
const DONE_DATA = [];
// DONE_DATA_END

const TAG_STYLES = {
  "bug fix":  { bg: "#3b1518", text: "#f87171", border: "#7f1d1d" },
  "geo map":  { bg: "#0c1a2e", text: "#60a5fa", border: "#1e3a5f" },
  "shacl":    { bg: "#1c1a0e", text: "#fbbf24", border: "#4a3f0e" },
  "data":     { bg: "#0b1f17", text: "#34d399", border: "#0f3d2a" },
  "build":    { bg: "#1a1530", text: "#a78bfa", border: "#2e2260" },
  "review":   { bg: "#1a1a1a", text: "#94a3b8", border: "#333" },
  "misc":     { bg: "#1a1a1a", text: "#94a3b8", border: "#333" },
};

function Tag({ tag }) {
  var s = TAG_STYLES[tag] || TAG_STYLES["misc"];
  return (
    <span style={{
      fontSize: 10, padding: "1px 7px", borderRadius: 4,
      background: s.bg, color: s.text, border: "1px solid " + s.border,
      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
      whiteSpace: "nowrap",
    }}>{tag}</span>
  );
}

function PrioNum({ n, color }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
      background: color + "22", color: color,
      fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
    }}>{n}</div>
  );
}

export default function KanbanBoard() {
  var bg = "#0f1219", cardBg = "#1a1f2e", brd = "#262d3d";
  var textPri = "#e2e8f0", textSec = "#94a3b8", textDim = "#475569";
  var colHdr = "#cbd5e1", blue = "#3b82f6";


  var colTitle = function(label, count) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colHdr, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: textDim, background: "#1e2433", padding: "1px 8px", borderRadius: 6 }}>{count}</span>
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontSize: 13, color: textPri, background: bg,
      borderRadius: 12, padding: "16px 16px 12px",
    }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: colHdr }}>CC prompt workflow</span>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {/* BACKLOG */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {colTitle("Backlog", BACKLOG_DATA.length)}
          {BACKLOG_DATA.map(function(item, idx) {
            return (
              <div key={item.id} style={{
                background: cardBg, border: "1px solid " + brd,
                borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                opacity: item.blocked ? 0.55 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <PrioNum n={idx + 1} color={item.accent} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: textPri }}>{item.title}</span>
                      <Tag tag={item.tag} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: textDim }}>{item.file}</span>
                      {item.blocked && (
                        <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, background: "#1c1a0e", color: "#fbbf24", border: "1px solid #4a3f0e", fontWeight: 600 }}>
                          {"\u23f8 " + item.blockedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* IN PROGRESS */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {colTitle("In progress", IN_PROGRESS_DATA.length)}
          {IN_PROGRESS_DATA.map(function(item) {
            return (
              <div key={item.id} style={{
                background: cardBg, border: "1px solid " + blue + "44",
                borderRadius: 8, padding: "10px 12px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: textPri }}>{item.title}</span>
                  <Tag tag={item.tag} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: textDim }}>{item.file}</span>
                  {item.commit && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: textSec, background: "#1e2433", padding: "1px 6px", borderRadius: 4 }}>
                      {item.commit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {IN_PROGRESS_DATA.length === 0 && (
            <div style={{ color: textDim, fontSize: 12, fontStyle: "italic", padding: 12 }}>Kein aktives Item</div>
          )}
        </div>

        {/* DONE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {colTitle("Done", DONE_DATA.reduce(function(s, g) { return s + (g.count || 1); }, 0))}
          {DONE_DATA.map(function(g, i) {
            var isToday = g.today;
            return (
              <div key={i} style={{
                background: cardBg, border: "1px solid " + (isToday ? "#34d39944" : brd),
                borderRadius: 8, padding: isToday ? "10px 12px" : "8px 10px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {isToday && <span style={{ fontSize: 10, color: "#34d399", fontWeight: 600 }}>heute</span>}
                  <span style={{ fontWeight: isToday ? 600 : 500, fontSize: isToday ? 13 : 12, color: isToday ? textPri : textSec }}>{g.title}</span>
                  <Tag tag={g.tag} />
                  {g.count > 0 && <span style={{ fontSize: 10, color: textDim, marginLeft: "auto" }}>{g.count}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
