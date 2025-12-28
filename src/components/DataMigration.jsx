import { useState } from 'react'
import { exportBrowserData, getMigrationStatus, markMigrationCompleted } from '../services/migrateData'
import './DataMigration.css'

function DataMigration({ onComplete }) {
  const [migrating, setMigrating] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')

  const handleMigrate = async () => {
    setMigrating(true)
    setError(null)
    setStatus(null)
    setProgress('Initializing...')

    try {
      setProgress('Please select a folder for your data...')
      // First, prompt user to select the data directory
      // This will be done automatically when fileStorage.initDataDirectory() is called
      const result = await exportBrowserData()
      
      setProgress('Migration complete!')
      
      setStatus({
        success: result.success,
        exported: result.exported,
        errors: result.errors,
        files: result.files
      })

      if (result.success) {
        // Mark migration as completed so it won't show again
        markMigrationCompleted()
        
        if (onComplete) {
          // Wait a bit before calling onComplete to show the success message
          setTimeout(() => {
            onComplete()
          }, 3000)
        }
      }
    } catch (err) {
      setError(err.message || 'Migration failed')
      setProgress('')
      console.error('Migration error:', err)
    } finally {
      setMigrating(false)
    }
  }

  if (status?.success) {
    return (
      <div className="migration-modal">
        <div className="migration-content">
          <h2>✅ Data Migration Complete!</h2>
          <div className="migration-summary">
            <p>Your data has been successfully exported to:</p>
            <p className="data-path">Documents/PeelEditor/data/</p>
            <div className="migration-stats">
              <div className="stat-item">
                <strong>{status.exported.posts || 0}</strong> Posts
              </div>
              <div className="stat-item">
                <strong>{status.exported.images || 0}</strong> Images
              </div>
              <div className="stat-item">
                <strong>{status.exported.profiles || 0}</strong> Profiles
              </div>
              <div className="stat-item">
                <strong>{status.exported.prompts || 0}</strong> Prompts
              </div>
              <div className="stat-item">
                <strong>{status.exported.settings || 0}</strong> Settings
              </div>
            </div>
            <p className="migration-note">
              All your data is now stored in files and will be automatically loaded when you use the app.
            </p>
            {status.errors.length > 0 && (
              <div className="migration-warnings">
                <h3>Warnings:</h3>
                <ul>
                  {status.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="migration-modal">
      <div className="migration-content">
        <h2>📁 Migrate Data to File Storage</h2>
        <p>
          Your data is currently stored in the browser. To make it persistent across all devices and browsers,
          we can move it to a folder in your Documents directory.
        </p>
        <div className="migration-info">
          <h3>What will be migrated:</h3>
          <ul>
            <li>✅ Feed posts</li>
            <li>✅ Gallery images</li>
            <li>✅ User profiles</li>
            <li>✅ Saved prompts</li>
            <li>✅ Settings (API key, API URL, app settings)</li>
          </ul>
          <p className="migration-note">
            <strong>Note:</strong> You'll be prompted to select a folder where the data will be stored.
            We recommend selecting your Documents folder, and we'll create a "PeelEditor" folder inside it.
            Your existing browser data will <strong>not be deleted</strong> - it's just being copied to files.
          </p>
        </div>
        
        {progress && migrating && (
          <div className="migration-progress">
            <div className="progress-spinner"></div>
            <p>{progress}</p>
          </div>
        )}

        {error && (
          <div className="migration-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="migration-actions">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="migrate-button"
          >
            {migrating ? 'Migrating...' : 'Start Migration'}
          </button>
          {onComplete && (
            <button
              onClick={onComplete}
              disabled={migrating}
              className="skip-button"
            >
              Skip for Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataMigration

