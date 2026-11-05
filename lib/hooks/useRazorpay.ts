import { useState, useEffect } from 'react'
import { RAZORPAY_SCRIPT_URL } from '@/lib/razorpay/config'

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // Check if Razorpay is already loaded
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in the document
    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true))
      existingScript.addEventListener('error', () => setIsError(true))
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_URL
    script.async = true

    script.onload = () => {
      setIsLoaded(true)
      setIsError(false)
    }

    script.onerror = () => {
      setIsError(true)
      setIsLoaded(false)
    }

    document.body.appendChild(script)

    return () => {
      // Cleanup: Remove event listeners if component unmounts
      script.onload = null
      script.onerror = null
    }
  }, [])

  return { isLoaded, isError }
}
