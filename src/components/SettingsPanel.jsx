import { useEffect, useState } from 'react'
import './SettingsPanel.css'

const DEFAULT_MODEL = 'bytedance-seed/seedream-5-0-flash'

function SettingsPanel({ settings, onChange, apiKey }) {
  const [models, setModels] = useState([])

  useEffect(() => {
    let cancelled = false
    const headers = {}
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    fetch('https://openrouter.ai/api/v1/images/models', { headers })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load image models')
        return response.json()
      })
      .then((result) => {
        if (!cancelled) setModels(Array.isArray(result.data) ? result.data : [])
      })
      .catch(() => {
        // The default remains selectable even when the model catalog is unavailable.
      })

    return () => { cancelled = true }
  }, [apiKey])

  const availableModels = [...models]
  if (!availableModels.some((model) => model.id === (settings.model || DEFAULT_MODEL))) {
    availableModels.unshift({ id: settings.model || DEFAULT_MODEL, name: settings.model === DEFAULT_MODEL ? 'Seedream 5.0 Flash' : (settings.model || DEFAULT_MODEL) })
  }

  return (
    <div className="settings-panel">
      <h2>Generation settings</h2>

      <div className="settings-group">
        <label htmlFor="image-model">Image model</label>
        <select
          id="image-model"
          className="settings-select"
          value={settings.model || DEFAULT_MODEL}
          onChange={(event) => onChange({ ...settings, model: event.target.value })}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name || model.id} ({model.id})
            </option>
          ))}
        </select>
        <div className="settings-description">
          Choose from OpenRouter’s available image generation models.
        </div>
      </div>

      <div className="settings-group">
        <label htmlFor="seed">Seed (Optional)</label>
        <input
          id="seed"
          type="number"
          value={settings.seed ?? ''}
          onChange={(e) => onChange({ ...settings, seed: e.target.value ? parseInt(e.target.value, 10) : null })}
          placeholder="Random"
          className="settings-input"
        />
        <div className="settings-description">
          Use the same seed to reproduce results. Leave empty for random generation.
        </div>
      </div>

      <div className="settings-info">
        <p><strong>Note:</strong> Available generation parameters depend on the selected model.</p>
      </div>
    </div>
  )
}

export default SettingsPanel
