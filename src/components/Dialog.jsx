import { useEffect, useRef, useId } from 'react'

export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className="studio-dialog" aria-labelledby={titleId} onCancel={onClose}
    onClick={e => { if (e.target === ref.current) onClose() }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button onClick={onClose} aria-label="Close dialog">×</button></div>
    {children}
  </dialog>
}
