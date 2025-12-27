import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import './JSONEditor.css'

function JSONEditor({ value, onChange }) {
  const [isValidJSON, setIsValidJSON] = useState(true)
  const [jsonError, setJsonError] = useState(null)
  const [viewMode, setViewMode] = useState('editor') // 'editor' or 'form'
  const [parsedJSON, setParsedJSON] = useState(null)

  useEffect(() => {
    if (!value.trim()) {
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

  const isJSONLike = value.trim().startsWith('{') || value.trim().startsWith('[')
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

