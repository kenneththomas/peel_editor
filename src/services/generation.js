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

export const MAX_GENERATIONS = 4

export function generationGroup(records, selected) {
  if (!selected) return []
  const groupId = selected.groupId || selected.id
  return records.filter(record => (record.groupId || record.id) === groupId)
    .sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0))
}

export function createGenerationBatch(source, count, existing = []) {
  if (!Number.isInteger(count) || count < 1 || existing.length + count > MAX_GENERATIONS) {
    throw new Error('A prompt can have up to 4 generations.')
  }
  const groupId = source.groupId || source.id
  const startIndex = Math.max(-1, ...existing.map(record => record.groupIndex ?? 0)) + 1
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(), groupId, groupIndex: startIndex + index,
    timestamp: new Date().toISOString(), prompt: source.prompt,
    settings: { ...source.settings }, references: source.references.map(image => ({ ...image })),
    status: 'pending',
  }))
}
