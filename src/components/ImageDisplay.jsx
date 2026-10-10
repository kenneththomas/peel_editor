import { useState, useEffect } from 'react'
import './ImageDisplay.css'

function ImageDisplay({ generatedImage, loading, generation, onSave, onImport, onRestore }) {
  const [zoom, setZoom] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [loading])
  const url = typeof generatedImage === 'string' ? generatedImage : generatedImage?.url
  return <div className="image-display-container">
    <div className="canvas-heading"><div><span className="eyebrow">WORKSPACE</span><h2>{url ? 'Your creation' : 'A little room for imagination.'}</h2></div>
      {url && <button onClick={() => setZoom(value => !value)} aria-pressed={zoom}>{zoom ? 'Fit image' : 'Actual size'}</button>}
    </div>
    <div className={`image-canvas ${zoom ? 'zoomed' : ''}`} aria-busy={loading}>
      {url ? <img src={url} alt={generation?.prompt || 'Generated image'} className="generated-image" /> : <div className="canvas-empty"><span aria-hidden="true">◒</span><h3>{generation && generation.status !== 'completed' ? `Generation ${generation.status}` : 'Start with an idea.'}</h3><p>{generation?.error || 'Your image will appear here. Every generation keeps its original inputs.'}</p></div>}
      {loading && <div className="canvas-progress" role="status"><div className="spinner" /><span>Generating · {elapsed}s</span></div>}
    </div>
    {url && <>
      <div className="canvas-meta"><span>{generation?.settings.model.split('/').pop()}</span><span>Seed: {generation?.settings.seed ?? 'Random'}</span></div>
      <div className="image-actions"><button disabled={saving} onClick={async () => { setSaving(true); try { await onSave() } finally { setSaving(false) } }} className="save-button">{saving ? 'Saving…' : 'Save to library'}</button><button onClick={onImport}>Use as reference</button><button onClick={onRestore}>Restore inputs</button><a href={url} download={`peel-${generation?.id || 'image'}.png`} className="download-button">Download</a></div>
    </>}
  </div>
}
export default ImageDisplay
