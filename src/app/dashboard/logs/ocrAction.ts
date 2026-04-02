'use server'

interface VisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string
    }>
  }>
}

export async function analyzeBillImage(base64Image: string) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY

  if (!apiKey) {
    return { 
      error: 'Google Vision API key not configured',
      vendorName: null,
      totalAmount: null
    }
  }

  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return { 
        error: `Vision API error: ${response.status} - ${JSON.stringify(errorData)}`,
        vendorName: null,
        totalAmount: null
      }
    }

    const data: VisionResponse = await response.json()

    // Get the full text from the first annotation
    const fullText = data.responses[0]?.textAnnotations?.[0]?.description

    if (!fullText) {
      return { 
        error: 'No text detected in the image',
        vendorName: null,
        totalAmount: null
      }
    }

    // Split text into lines
    const lines = fullText.split('\n').filter(line => line.trim())

    // Extract vendor name (first non-empty line)
    const vendorName = lines[0] || 'Unknown Vendor'

    // Find all currency amounts in the text
    // Matches patterns like: ₹1,234.56, Rs. 1234.56, 1234.56, etc.
    const currencyRegex = /(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
    const amounts: number[] = []

    let match
    while ((match = currencyRegex.exec(fullText)) !== null) {
      // Remove commas and convert to number
      const amount = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount)
      }
    }

    // Get the highest amount (typically the total)
    const totalAmount = amounts.length > 0 
      ? Math.max(...amounts) 
      : null

    return {
      vendorName,
      totalAmount,
      error: null,
      fullText, // Include full text for debugging
    }
  } catch (error) {
    return { 
      error: `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      vendorName: null,
      totalAmount: null
    }
  }
}
