import './SettingsPanel.css'

function SettingsPanel({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <h2>Generation Settings</h2>
      
      <div className="settings-group">
        <label htmlFor="seed">Seed (Optional)</label>
        <input
          id="seed"
          type="number"
          value={settings.seed || ''}
          onChange={(e) => onChange({ ...settings, seed: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Random"
          className="settings-input"
        />
        <div className="settings-description">
          Use the same seed to reproduce results. Leave empty for random generation.
        </div>
      </div>

      <div className="settings-info">
        <p><strong>Note:</strong> The API automatically determines resolution and other generation parameters based on your prompt. Additional settings will be added as they become available in the API.</p>
      </div>
    </div>
  )
}

export default SettingsPanel

