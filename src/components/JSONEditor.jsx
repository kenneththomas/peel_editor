import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { savePrompt, getSavedPrompts, deletePrompt } from '../services/prompts'
import './JSONEditor.css'

function JSONEditor({ value, onChange }) {
  const [isValidJSON, setIsValidJSON] = useState(true)
  const [jsonError, setJsonError] = useState(null)
  const [viewMode, setViewMode] = useState('editor') // 'editor' or 'form'
  const [parsedJSON, setParsedJSON] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [savePromptName, setSavePromptName] = useState('')
  const [savedPrompts, setSavedPrompts] = useState([])

  useEffect(() => {
    if (!value || !value.trim()) {
      setIsValidJSON(true)
      setJsonError(null)
      setParsedJSON(null)
      return
    }

    try {
      const parsed = JSON.parse(value)
      setIsValidJSON(true)
      setJsonError(null)
      setParsedJSON(parsed)
    } catch (e) {
      setIsValidJSON(false)
      setJsonError(e.message)
      setParsedJSON(null)
    }
  }, [value])

  // Load saved prompts when component mounts or when menu is shown
  useEffect(() => {
    if (showLoadMenu) {
      setSavedPrompts(getSavedPrompts())
    }
  }, [showLoadMenu])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLoadMenu && !event.target.closest('.load-prompt-wrapper')) {
        setShowLoadMenu(false)
      }
    }

    if (showLoadMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showLoadMenu])

  const handleEditorChange = (newValue) => {
    onChange(newValue || '')
  }

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value)
      onChange(JSON.stringify(parsed, null, 2))
    } catch (e) {
      // Can't format invalid JSON
    }
  }

  const handleSavePrompt = () => {
    if (!value || !value.trim()) {
      alert('Please enter a prompt before saving')
      return
    }
    setShowSaveModal(true)
    setSavePromptName('')
  }

  const handleConfirmSave = () => {
    try {
      savePrompt(value, savePromptName || null)
      setShowSaveModal(false)
      setSavePromptName('')
      alert('Prompt saved successfully!')
    } catch (error) {
      alert('Failed to save prompt: ' + error.message)
    }
  }

  const handleLoadPrompt = (promptText) => {
    onChange(promptText)
    setShowLoadMenu(false)
  }

  const handleDeletePrompt = (promptId, e) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        deletePrompt(promptId)
        setSavedPrompts(getSavedPrompts())
      } catch (error) {
        alert('Failed to delete prompt: ' + error.message)
      }
    }
  }

  const updateJSONValue = (path, newValue) => {
    try {
      const parsed = JSON.parse(value)
      
      // Parse path - handle both object keys and array indices
      // Format: "outfit.top" or "[0]" or "outfit.items[0].name"
      const parts = []
      let current = ''
      for (let i = 0; i < path.length; i++) {
        if (path[i] === '[') {
          if (current) {
            parts.push(current)
            current = ''
          }
          i++ // skip '['
          let index = ''
          while (i < path.length && path[i] !== ']') {
            index += path[i]
            i++
          }
          parts.push(parseInt(index))
        } else if (path[i] === '.') {
          if (current) {
            parts.push(current)
            current = ''
          }
        } else {
          current += path[i]
        }
      }
      if (current) {
        parts.push(current)
      }
      
      // Navigate to the parent
      let target = parsed
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]]
      }
      
      // Update the value
      target[parts[parts.length - 1]] = newValue
      
      // Update the JSON string
      onChange(JSON.stringify(parsed, null, 2))
    } catch (e) {
      console.error('Error updating JSON:', e)
    }
  }

  const renderJSONForm = (obj, path = '') => {
    if (obj === null || obj === undefined) {
      return <span className="json-value-null">null</span>
    }

    if (typeof obj === 'string') {
      return (
        <EditableValue
          value={obj}
          onUpdate={(newValue) => updateJSONValue(path, newValue)}
        />
      )
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return (
        <EditableValue
          value={String(obj)}
          onUpdate={(newValue) => {
            const converted = typeof obj === 'number' ? parseFloat(newValue) || 0 : newValue === 'true'
            updateJSONValue(path, converted)
          }}
        />
      )
    }

    if (Array.isArray(obj)) {
      return (
        <div className="json-array">
          {obj.map((item, index) => {
            const arrayPath = path ? `${path}[${index}]` : `[${index}]`
            return (
              <div key={index} className="json-array-item">
                <span className="json-array-index">[{index}]</span>
                <div className="json-array-content">
                  {renderJSONForm(item, arrayPath)}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof obj === 'object') {
      return (
        <div className="json-object">
          {Object.entries(obj).map(([key, val]) => {
            const currentPath = path ? `${path}.${key}` : key
            return (
              <div key={key} className="json-field">
                <span className="json-key">{key}:</span>
                <div className="json-value-wrapper">
                  {typeof val === 'object' && val !== null && !Array.isArray(val) ? (
                    <div className="json-nested-object">
                      {renderJSONForm(val, currentPath)}
                    </div>
                  ) : (
                    renderJSONForm(val, currentPath)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    return <span>{String(obj)}</span>
  }

  const isJSONLike = value && (value.trim().startsWith('{') || value.trim().startsWith('['))
  const canShowForm = isValidJSON && isJSONLike && parsedJSON && typeof parsedJSON === 'object'

  return (
    <div className="json-editor-container">
      <div className="json-editor-header">
        <h2>Prompt</h2>
        <div className="header-actions">
          {canShowForm && (
            <div className="view-toggle">
              <button
                className={`toggle-button ${viewMode === 'editor' ? 'active' : ''}`}
                onClick={() => setViewMode('editor')}
              >
                Editor
              </button>
              <button
                className={`toggle-button ${viewMode === 'form' ? 'active' : ''}`}
                onClick={() => setViewMode('form')}
              >
                Form View
              </button>
            </div>
          )}
          <div className="prompt-actions">
            <button onClick={handleSavePrompt} className="save-prompt-button">
              💾 Save Prompt
            </button>
            <div className="load-prompt-wrapper">
              <button 
                onClick={() => setShowLoadMenu(!showLoadMenu)} 
                className="load-prompt-button"
              >
                📂 Load Prompt
              </button>
              {showLoadMenu && (
                <div className="prompts-dropdown">
                  {savedPrompts.length === 0 ? (
                    <div className="prompt-dropdown-empty">No saved prompts</div>
                  ) : (
                    savedPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="prompt-dropdown-item"
                        onClick={() => handleLoadPrompt(prompt.text)}
                      >
                        <div className="prompt-item-info">
                          <div className="prompt-item-name">{prompt.name}</div>
                          <div className="prompt-item-date">
                            {new Date(prompt.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          className="prompt-delete-button"
                          onClick={(e) => handleDeletePrompt(prompt.id, e)}
                          title="Delete prompt"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {isJSONLike && (
            <button onClick={formatJSON} className="format-button">
              Format JSON
            </button>
          )}
        </div>
      </div>
      
      {viewMode === 'editor' ? (
        <div className="editor-wrapper">
          {isJSONLike ? (
            <Editor
              height="400px"
              defaultLanguage="json"
              value={value}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                automaticLayout: true,
              }}
            />
          ) : (
            <Editor
              height="400px"
              defaultLanguage="plaintext"
              value={value}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          )}
        </div>
      ) : (
        <div className="json-form-wrapper">
          {canShowForm && renderJSONForm(parsedJSON)}
        </div>
      )}

      {!isValidJSON && jsonError && (
        <div className="json-error">
          <strong>JSON Error:</strong> {jsonError}
        </div>
      )}

      {isValidJSON && isJSONLike && (
        <div className="json-valid">
          ✓ Valid JSON format
        </div>
      )}

      <div className="prompt-hint">
        <p>Enter your prompt here. If it starts with <code>{'{'}</code> or <code>[</code>, it will be treated as JSON and highlighted.</p>
        <p>You can also use plain text prompts for simple generation.</p>
      </div>

      {/* Save Prompt Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Prompt</h3>
            <input
              type="text"
              className="prompt-name-input"
              value={savePromptName}
              onChange={(e) => setSavePromptName(e.target.value)}
              placeholder="Enter a name for this prompt (optional)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmSave()
                } else if (e.key === 'Escape') {
                  setShowSaveModal(false)
                }
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={handleConfirmSave} className="modal-save-button">
                Save
              </button>
              <button onClick={() => setShowSaveModal(false)} className="modal-cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditableValue({ value, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onUpdate(editValue)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        type="text"
        className="json-value-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    )
  }

  return (
    <span className="json-value-clickable" onClick={handleClick} title="Click to edit">
      {value}
      <span className="edit-icon">✏️</span>
    </span>
  )
}

export default JSONEditor

