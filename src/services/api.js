/**
 * Image generation through OpenRouter's unified Image API.
 */

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/images'
const DEFAULT_MODEL = 'google/gemini-3.1-flash-image'
const LITE_MODEL = 'google/gemini-3.1-flash-lite-image'

function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getErrorMessage(errorData, response) {
  const apiMessage = errorData?.error?.message || errorData?.message
  return apiMessage || `OpenRouter API error: ${response.status} ${response.statusText}`
}

export async function generateImage(apiKey, prompt, inputImages = null, settings = {}, customApiUrl = null) {
  const apiUrl = customApiUrl || import.meta.env.VITE_OPENROUTER_API_URL || DEFAULT_ENDPOINT
  const model = settings.useLiteModel
    ? LITE_MODEL
    : (import.meta.env.VITE_OPENROUTER_MODEL || DEFAULT_MODEL)

  if (!apiKey) {
    throw new Error('OpenRouter API key is required')
  }

  const requestBody = {
    model,
    prompt: typeof prompt === 'object' ? (prompt.text || JSON.stringify(prompt)) : prompt,
  }

  if (settings.seed !== null && settings.seed !== undefined) {
    requestBody.seed = settings.seed
  }

  if (inputImages) {
    try {
      const images = (Array.isArray(inputImages) ? inputImages : [inputImages]).filter(Boolean)
      requestBody.input_references = await Promise.all(images.map(async (image) => ({
        type: 'image_url',
        image_url: {
          url: await imageToDataUrl(image),
        },
      })))
    } catch (error) {
      console.error('Error converting reference image:', error)
      throw new Error('Failed to process input image')
    }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(getErrorMessage(result, response))
    }

    const image = result?.data?.[0]
    if (image?.b64_json) {
      return {
        url: `data:${image.media_type || 'image/png'};base64,${image.b64_json}`,
      }
    }

    if (image?.url) {
      return { url: image.url }
    }

    throw new Error('OpenRouter returned no generated image')
  } catch (error) {
    console.error('OpenRouter request failed:', error)

    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error(`Failed to connect to OpenRouter at ${apiUrl}. Check your network connection and API endpoint.`)
    }

    throw error
  }
}
