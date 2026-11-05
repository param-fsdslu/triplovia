import Razorpay from 'razorpay'

// Server-side Razorpay instance (with key secret)
export const razorpayInstance = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Client-side Razorpay key (public)
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!

// Razorpay currency
export const RAZORPAY_CURRENCY = 'INR'

// Razorpay script URL
export const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
