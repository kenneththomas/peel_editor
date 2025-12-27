import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import './JSONEditor.css'

function JSONEditor({ value, onChange }) {
  const [isValidJSON, setIsValidJSON] = useState(true)
  const [jsonError, setJsonError] = useState(null)

  useEffect(() => {
    if (!value.trim()) {
      setIsValidJSON(true)
      setJsonError(null)
      return
    }

    try {
      JSON.parse(value)
      setIsValidJSON(true)
      setJsonError(null)
    } catch (e) {
      setIsValidJSON(false)
      setJsonError(e.message)
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

  const isJSONLike = value.trim().startsWith('{') || value.trim().startsWith('[')

  return (
    <div className="json-editor-container">
      <div className="json-editor-header">
        <h2>Prompt</h2>
        {isJSONLike && (
          <button onClick={formatJSON} className="format-button">
            Format JSON
          </button>
        )}
      </div>
      
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

export default JSONEditor

