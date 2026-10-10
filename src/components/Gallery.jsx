import { useState, useEffect, useRef } from 'react'
import { getSavedImages, deleteImage, saveImage, updateImage, restoreImage } from '../services/gallery'
import Dialog from './Dialog'
import './Gallery.css'

export default function Gallery({ refreshTrigger, onImport, onNewPost, onChange }) {
  const [images, setImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ title: '', tags: '', collection: '' })
  const fileInput = useRef(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSavedImages().then(records => { if (!cancelled) { setImages(records); setError('') } })
      .catch(err => { if (!cancelled) setError(err.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshTrigger])
  const collections = [...new Set(images.map(image => image.collection).filter(Boolean))].sort()
  const visible = images.filter(image => (!favorites || image.favorite) && (!collection || image.collection === collection) &&
    [image.title, image.prompt, image.collection, ...(image.tags || [])].join(' ').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'title' ? (a.title || a.prompt || '').localeCompare(b.title || b.prompt || '') : sort === 'oldest' ? a.timestamp.localeCompare(b.timestamp) : b.timestamp.localeCompare(a.timestamp))
  function open(image) { setSelected(image); setDraft({ title: image.title || '', tags: (image.tags || []).join(', '), collection: image.collection || '' }) }
  async function upload(files) {
    if (!files.length) return
    setBusy(true); setError('')
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error('Choose image files')
        const url = URL.createObjectURL(file)
        try { await saveImage(url, { title: file.name, collection }) } finally { URL.revokeObjectURL(url) }
      }
      onChange()
    } catch (err) { setError(err.message); onChange() } finally { setBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }
  async function toggleFavorite(image) {
    try { await updateImage(image.id, { favorite: !image.favorite }); onChange(); if (selected?.id === image.id) setSelected({ ...image, favorite: !image.favorite }) }
    catch (err) { setError(err.message) }
  }
  async function saveDetails(event) {
    event.preventDefault(); setBusy(true)
    try {
      const changes = { title: draft.title.trim(), collection: draft.collection.trim(), tags: [...new Set(draft.tags.split(',').map(tag => tag.trim()).filter(Boolean))] }
      await updateImage(selected.id, changes); setSelected({ ...selected, ...changes }); onChange()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function remove(image) {
    try { await deleteImage(image.id); setDeleted(image); setSelected(null); onChange() } catch (err) { setError(err.message) }
  }
  async function undo() {
    try { await restoreImage(deleted); setDeleted(null); onChange() } catch (err) { setError(err.message) }
  }
  return <main className="gallery-container library">
    <div className="gallery-header"><div><span className="eyebrow">KEEP THE GOOD ONES</span><h2>Your library</h2><p className="muted">{images.length} images · Stored in this browser</p></div>
      <button disabled={busy} onClick={() => fileInput.current.click()} className="save-button">{busy ? 'Saving…' : 'Add images'}</button>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => upload(Array.from(event.target.files))} />
    </div>
    {error && <div className="error-message" role="alert">{error}</div>}
    {deleted && <div className="undo-notice" role="status">Image removed from library.<button onClick={undo}>Undo</button><button aria-label="Dismiss undo" onClick={() => setDeleted(null)}>×</button></div>}
    <div className="library-filters"><input aria-label="Search library" placeholder="Search prompts, titles, or tags…" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="Filter collection" value={collection} onChange={e => setCollection(e.target.value)}><option value="">All collections</option>{collections.map(name => <option key={name}>{name}</option>)}</select>
      <button aria-pressed={favorites} className={favorites ? 'active' : ''} onClick={() => setFavorites(value => !value)}>Favorites</button>
      <select aria-label="Sort library" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select>
    </div>
    <div className="library-drop-target" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); upload(Array.from(event.dataTransfer.files)) }}>
      {loading ? <p className="library-empty" role="status">Loading your library…</p> : !visible.length ? <div className="library-empty"><h3>{images.length ? 'No matching images' : 'A home for your favorite ideas.'}</h3><p>{images.length ? 'Try another search or collection.' : 'Save a generation or add images. Drop files here to import them.'}</p></div> :
        <div className="gallery-grid">{visible.map(image => <article className="gallery-item" key={image.id}>
          <button className="library-image-button" onClick={() => open(image)} aria-label={`Open ${image.title || image.prompt || 'image'}`}><img loading="lazy" src={image.imageUrl} alt={image.title || image.prompt || 'Saved image'} /></button>
          <div className="library-card-info"><button onClick={() => open(image)} className="library-title">{image.title || image.prompt || 'Untitled image'}</button><button onClick={() => toggleFavorite(image)} aria-label={image.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={Boolean(image.favorite)}>{image.favorite ? '★' : '☆'}</button></div>
          <div className="library-card-meta"><span>{image.collection || 'Unsorted'}</span><span>{new Date(image.timestamp).toLocaleDateString()}</span></div>
          {!!image.tags?.length && <div className="library-tags">{image.tags.map(tag => <button key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        </article>)}</div>}
    </div>
    {selected && <Dialog title="Image details" onClose={() => setSelected(null)}>
      <img className="library-detail-image" src={selected.imageUrl} alt={selected.title || selected.prompt || 'Saved image'} />
      <form onSubmit={saveDetails} className="library-detail-form"><label>Title<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>Collection<input list="collection-options" value={draft.collection} placeholder="e.g. Portrait studies" onChange={e => setDraft({ ...draft, collection: e.target.value })} /></label><datalist id="collection-options">{collections.map(name => <option key={name} value={name} />)}</datalist>
        <label>Tags<input value={draft.tags} placeholder="film, coastal, soft light" onChange={e => setDraft({ ...draft, tags: e.target.value })} /></label><button disabled={busy} className="save-button">{busy ? 'Saving…' : 'Save details'}</button>
      </form>
      {selected.prompt && <details className="advanced-settings"><summary>Original prompt and settings</summary><p className="saved-prompt">{selected.prompt}</p><p className="muted">{selected.settings?.model || 'Imported image'} · Seed: {selected.settings?.seed ?? 'Random'}</p></details>}
      <div className="image-actions"><button onClick={() => { onImport(selected); setSelected(null) }}>Use as reference</button><button onClick={() => { onNewPost(selected); setSelected(null) }}>New post</button><a className="download-button" href={selected.imageUrl} download={`peel-${selected.id}.png`}>Download</a><button className="danger-button" onClick={() => remove(selected)}>Remove</button></div>
    </Dialog>}
  </main>
}
