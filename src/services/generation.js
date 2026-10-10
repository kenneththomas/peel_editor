export function parsePrompt(prompt) {
  if (/^[\[{]/.test(prompt.trim())) return JSON.parse(prompt)
  return prompt
}

export function createGeneration(prompt, settings, references = []) {
  // Capture inputs before the request; never read mutable editor state when saving.
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    prompt,
    settings: { model: settings.model, seed: settings.seed ?? null },
    references: references.map(image => ({ name: image.file.name, type: image.file.type, preview: image.preview })),
    status: 'pending',
  }
}
