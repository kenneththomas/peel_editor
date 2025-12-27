/**
 * API service for Google Nano Banana Pro API
 * This service handles image generation requests
 */

// Helper to convert image file to base64
async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function generateImage(apiKey, prompt, inputImage = null, settings = {}, customApiUrl = null) {
  // API endpoint - Google Nano Banana Pro API endpoint
  // Based on documentation: https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
  const defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent'
  const apiUrl = customApiUrl || import.meta.env.VITE_API_URL || defaultEndpoint
  
  if (!apiKey) {
    throw new Error('API key is required')
  }
  
  // Build request body for Google Generative AI API format
  // The API expects contents array with parts containing text and/or inlineData
  const promptText = typeof prompt === 'object' ? (prompt.text || JSON.stringify(prompt)) : prompt
  
  const requestBody = {
    contents: [{
      parts: [
        { text: promptText }
      ]
    }]
  }

  // Add input image if provided
  if (inputImage) {
    try {
      const base64Image = await imageToBase64(inputImage)
      requestBody.contents[0].parts.push({
        inlineData: {
          mimeType: inputImage.type || 'image/png',
          data: base64Image
        }
      })
    } catch (error) {
      console.error('Error converting image to base64:', error)
      throw new Error('Failed to process input image')
    }
  }

  // Add generation settings - only include supported parameters
  // Based on Google Generative AI API spec, generationConfig may have limited fields
  // Remove unsupported fields: width, height, guidanceScale, steps
  const generationConfig = {}
  
  // Only add fields that are actually supported by the API
  // Check API documentation for supported generationConfig fields
  // For now, we'll keep it minimal to avoid errors
  
  if (settings.seed !== null && settings.seed !== undefined) {
    generationConfig.seed = settings.seed
  }
  
  // Note: Other settings like resolution, width, height, guidanceScale, steps
  // are not supported in generationConfig for this API endpoint
  // They may need to be specified differently or are not available
  
  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig
  }

  try {
    console.log('Sending request to:', apiUrl)
    console.log('API Key present:', !!apiKey, 'Length:', apiKey?.length)
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    // Google API uses x-goog-api-key header for authentication
    // Also support query parameter as fallback
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody)
    }
    
    // Try with header first, fallback to query param if needed
    let fetchUrl = apiUrl
    
    console.log('Fetch URL:', fetchUrl)
    console.log('Fetch options:', { ...fetchOptions, headers: { ...fetchOptions.headers, 'x-goog-api-key': '[REDACTED]' }, body: '[request body]' })
    
    const response = await fetch(fetchUrl, fetchOptions)

    console.log('Response status:', response.status, response.statusText)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        console.error('API error response:', errorData)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        if (errorData.error?.details) {
          errorMessage += `\nDetails: ${JSON.stringify(errorData.error.details)}`
        }
      } catch (e) {
        const errorText = await response.text().catch(() => '')
        console.error('Error response text:', errorText)
        if (errorText) {
          errorMessage = `${errorMessage}: ${errorText.substring(0, 500)}`
        }
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('API response:', result)
    
    // Handle Google Generative AI API response format
    // Response structure: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return { url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` }
          }
        }
      }
    }
    
    // Fallback: Handle other response formats
    if (result.image_url) {
      return { url: result.image_url }
    } else if (result.image) {
      return { url: result.image }
    } else if (result.data) {
      // If base64 image data
      if (result.data.startsWith('data:image')) {
        return result.data
      }
      return { url: `data:image/png;base64,${result.data}` }
    } else if (result.generatedImages && result.generatedImages.length > 0) {
      // Handle array of generated images
      return { url: result.generatedImages[0].imageUrl || result.generatedImages[0].base64Image }
    } else {
      // Return full result for debugging
      console.warn('Unexpected response format:', result)
      return result
    }
  } catch (error) {
    console.error('API request failed:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Provide more specific error messages
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const detailedError = `Failed to connect to API.

Possible causes:
1. CORS issue - The API server doesn't allow requests from your browser origin
   Solution: Use a backend proxy or configure CORS on the API server

2. Incorrect endpoint URL - The default endpoint may not be correct
   Current endpoint: ${apiUrl}
   Solution: Check the API documentation and update the endpoint URL

3. Network issue - Check your internet connection

4. Invalid API key format
   Your API key length: ${apiKey?.length || 0} characters

Check the browser console (F12) for detailed request/response information.`
      throw new Error(detailedError)
    }
    
    if (error.message) {
      throw error
    }
    
    throw new Error('Failed to connect to API. Please check your API key and network connection.')
  }
}

/**
 * Alternative implementation for different API formats
 * Uncomment and modify based on actual API documentation
 */
/*
export async function generateImage(apiKey, prompt, inputImage = null) {
  const requestBody = {
    prompt: typeof prompt === 'object' ? prompt : { text: prompt },
    ...(inputImage && { input_image: await imageToBase64(inputImage) })
  }

  const response = await fetch('https://api.example.com/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return await response.json()
}

async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
*/

