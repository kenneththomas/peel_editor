import { useState, useEffect } from 'react'
import './ImageDisplay.css'

function ImageDisplay({ generatedImage, loading, generation, onSave, onImport, onRestore, generations = [], onSelect, onGenerateAdditional, canGenerateAdditional }) {
  const [zoom, setZoom] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const selectedIndex = generations.findIndex(record => record.id === generation?.id)
  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [loading])
  useEffect(() => { setZoom(false) }, [generation?.id])
  const url = typeof generatedImage === 'string' ? generatedImage : generatedImage?.url
  return <div className="image-display-container">
    <div className="canvas-heading"><div><span className="eyebrow">WORKSPACE</span><h2>{url ? 'Your creation' : 'A little room for imagination.'}</h2></div>
      {url && <button onClick={() => setZoom(value => !value)} aria-pressed={zoom}>{zoom ? 'Fit image' : 'Actual size'}</button>}
    </div>
    <div className={`image-canvas ${zoom ? 'zoomed' : ''}`} aria-busy={loading}>
      {url ? <img src={url} alt={generation?.prompt || 'Generated image'} className="generated-image" /> : <div className="canvas-empty"><span aria-hidden="true">◒</span><h3>{generation && generation.status !== 'completed' ? `Generation ${generation.status}` : 'Start with an idea.'}</h3><p>{generation?.error || 'Your image will appear here. Every generation keeps its original inputs.'}</p></div>}
      {loading && <div className="canvas-progress" role="status"><div className="spinner" /><span>Generating · {elapsed}s</span></div>}
    </div>
    {generations.length > 1 && <nav className="generation-carousel" aria-label="Results for this prompt">
      <button aria-label="Previous generation" onClick={() => onSelect(generations[(selectedIndex - 1 + generations.length) % generations.length])}>←</button>
      <span aria-live="polite">{selectedIndex + 1} / {generations.length}</span>
      <div className="generation-thumbnails">{generations.map((record, index) => <button key={record.id} className={record.id === generation?.id ? 'selected' : ''} aria-label={`View generation ${index + 1}: ${record.status}`} aria-current={record.id === generation?.id ? 'true' : undefined} onClick={() => onSelect(record)}>
        {record.result ? <img src={record.result.url} alt="" /> : <span>{index + 1}<small>{record.status}</small></span>}
      </button>)}</div>
      <button aria-label="Next generation" onClick={() => onSelect(generations[(selectedIndex + 1) % generations.length])}>→</button>
    </nav>}
    {url && <>
      <div className="canvas-meta"><span>{generation?.settings.model.split('/').pop()}</span><span>Seed: {generation?.settings.seed ?? 'Random'}</span></div>
    </>}
    {generation && <div className="image-actions">
      <button disabled={!url || saving} onClick={async () => { setSaving(true); try { await onSave() } finally { setSaving(false) } }} className="save-button">{saving ? 'Saving…' : 'Save to library'}</button>
      <button onClick={onGenerateAdditional} disabled={!canGenerateAdditional} title="Generate another image using this prompt’s original inputs">{generations.length >= 4 ? '4 generation limit reached' : 'Generate another'}</button>
      {url && <button onClick={onImport}>Use as reference</button>}
      <button onClick={onRestore}>Restore inputs</button>
      {url && <a href={url} download={`peel-${generation?.id || 'image'}.png`} className="download-button">Download</a>}
    </div>}
  </div>
}
export default ImageDisplay
