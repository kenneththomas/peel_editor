import test from 'node:test'
import assert from 'node:assert/strict'
import { createGeneration, parsePrompt, createGenerationBatch, generationGroup } from '../src/services/generation.js'

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

test('batches share original inputs and keep stable carousel order after out-of-order completion', () => {
  const source = createGeneration('Original', { model: 'test/model', seed: 42 })
  const batch = createGenerationBatch(source, 3)
  assert.equal(new Set(batch.map(record => record.id)).size, 3)
  assert.ok(batch.every(record => record.groupId === source.id))
  const additional = createGenerationBatch(batch[1], 1, batch)
  const records = [additional[0], { ...batch[2], status: 'completed' }, batch[0], batch[1]]
  assert.deepEqual(generationGroup(records, batch[1]).map(record => record.groupIndex), [0, 1, 2, 3])
  assert.equal(additional[0].prompt, 'Original')
  assert.deepEqual(additional[0].settings, { model: 'test/model', seed: 42 })
  assert.throws(() => createGenerationBatch(batch[0], 1, records), /up to 4/)
})

test('failed and pending slots count toward the cap; legacy runs remain separate', () => {
  const legacy = createGeneration('Same prompt', { model: 'test/model' })
  const other = createGeneration('Same prompt', { model: 'test/model' })
  assert.deepEqual(generationGroup([legacy, other], legacy), [legacy])
  const batch = createGenerationBatch(legacy, 3, [legacy])
  const records = [legacy, ...batch.map((record, index) => ({ ...record, status: index === 0 ? 'failed' : 'pending' }))]
  assert.equal(generationGroup(records, batch[0]).length, 4)
  assert.throws(() => createGenerationBatch(batch[0], 1, records), /up to 4/)
  for (const count of [0, 5, 1.5, NaN]) assert.throws(() => createGenerationBatch(legacy, count))
})
