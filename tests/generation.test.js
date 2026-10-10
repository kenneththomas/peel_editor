import test from 'node:test'
import assert from 'node:assert/strict'
import { createGeneration, parsePrompt } from '../src/services/generation.js'

test('generation inputs remain tied to the submitted prompt and settings', () => {
  let prompt = 'Original prompt'
  const settings = { model: 'test/model', seed: 42 }
  const references = [{ file: { name: 'original.png', type: 'image/png' }, preview: 'data:image/png;base64,original' }]
  const generation = createGeneration(prompt, settings, references)
  prompt = 'Later edit'
  settings.seed = 99
  references[0].preview = 'edited'
  assert.equal(generation.prompt, 'Original prompt')
  assert.deepEqual(generation.settings, { model: 'test/model', seed: 42 })
  assert.equal(generation.references[0].preview, 'data:image/png;base64,original')
  assert.equal(generation.status, 'pending')
  assert.ok(generation.id)
})

test('plain text is accepted while malformed JSON is rejected', () => {
  assert.equal(parsePrompt('A portrait in soft light'), 'A portrait in soft light')
  assert.deepEqual(parsePrompt('{"text":"A portrait"}'), { text: 'A portrait' })
  assert.throws(() => parsePrompt('{"text":'), SyntaxError)
})
