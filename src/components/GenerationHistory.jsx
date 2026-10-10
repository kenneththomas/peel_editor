export default function GenerationHistory({ records, selectedId, onSelect, onRestore }) {
  return <section className="history-panel" aria-labelledby="history-title">
    <div className="section-heading"><h2 id="history-title">Recent generations</h2><span>{records.length} runs</span></div>
    {!records.length ? <p className="muted">Your generations are saved here automatically, including their original inputs.</p> :
      <div className="history-list">{records.map(record => <article key={record.id} className={`history-card ${selectedId === record.id ? 'selected' : ''}`}>
        <button className="history-preview" onClick={() => onSelect(record)} aria-label={`View generation: ${record.prompt}`}>
          {record.result ? <img loading="lazy" src={record.result.url} alt="" /> : <span>{record.status}</span>}
        </button>
        <div className="history-info"><p title={record.prompt}>{record.prompt}</p><small>{record.settings.model.split('/').pop()} · {new Date(record.timestamp).toLocaleString()}</small>
          {record.error && <small className="history-error">{record.error}</small>}
          <button onClick={() => onRestore(record)}>Restore inputs</button>
        </div>
      </article>)}</div>}
  </section>
}
