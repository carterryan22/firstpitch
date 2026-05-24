import { loadSafetyRules } from "@platform/corpus";

export default function SafetyPage() {
  const { rules } = loadSafetyRules();
  return (
    <div>
      <h1>Tier 1 safety rules ({rules.length})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e5e5" }}>
            <th>ID</th><th>Domain</th><th>Age</th><th>Enforcement</th><th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.rule_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td><code>{r.rule_id}</code></td>
              <td>{r.domain}</td>
              <td>{r.age_band}</td>
              <td>{r.enforcement}</td>
              <td><a href={r.source_url}>{r.source_name}</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
