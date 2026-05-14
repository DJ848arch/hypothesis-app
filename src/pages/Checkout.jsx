import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, Check, ChevronRight } from 'lucide-react'
import { useCart } from '../context/CartContext'

const STEPS = ['Cart', 'Details', 'Payment', 'Confirm']

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-2 ${i <= step ? 'text-white' : 'text-gray-600'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
              i < step ? 'bg-brand-600 border-brand-600 text-white' :
              i === step ? 'border-brand-500 text-brand-400' :
              'border-gray-700 text-gray-600'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className="text-sm font-medium hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px ${i < step ? 'bg-brand-600' : 'bg-gray-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function Checkout() {
  const { items, total, clear } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '',
    card: '', expiry: '', cvv: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const formatCard = (val) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  }

  const validateDetails = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validatePayment = () => {
    const e = {}
    const rawCard = form.card.replace(/\s/g, '')
    if (rawCard.length < 16) e.card = 'Enter a valid 16-digit card number'
    if (!form.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = 'Use MM/YY format'
    if (form.cvv.length < 3) e.cvv = 'CVV must be 3–4 digits'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateDetails()) setStep(2)
    if (step === 2 && validatePayment()) setStep(3)
  }

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => {
      clear()
      navigate('/order-success')
    }, 1500)
  }

  if (items.length === 0 && step < 3) {
    navigate('/cart')
    return null
  }

  return (
    <div className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-white mb-8">Checkout</h1>
      <ProgressBar step={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          {/* Step 1: Contact details */}
          {step === 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-white text-xl flex items-center gap-2">
                Contact Details
              </h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                <input value={form.name} onChange={set('name')} placeholder="Jane Smith" className="input" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" className="input" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                <p className="text-gray-600 text-xs mt-1">Your downloads will be sent to this address.</p>
              </div>
              <button onClick={handleNext} className="btn-primary w-full justify-center py-3.5 mt-2">
                Continue to Payment <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-white text-xl flex items-center gap-2">
                <CreditCard size={20} className="text-brand-400" /> Payment
              </h2>
              <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-400">
                <Lock size={14} /> Secured with 256-bit SSL encryption
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Card Number</label>
                <input
                  value={form.card}
                  onChange={e => setForm(f => ({ ...f, card: formatCard(e.target.value) }))}
                  placeholder="1234 5678 9012 3456"
                  className="input font-mono tracking-widest"
                  maxLength={19}
                />
                {errors.card && <p className="text-red-400 text-xs mt-1">{errors.card}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Expiry</label>
                  <input
                    value={form.expiry}
                    onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY"
                    className="input font-mono"
                    maxLength={5}
                  />
                  {errors.expiry && <p className="text-red-400 text-xs mt-1">{errors.expiry}</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">CVV</label>
                  <input
                    value={form.cvv}
                    onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="123"
                    className="input font-mono"
                    maxLength={4}
                  />
                  {errors.cvv && <p className="text-red-400 text-xs mt-1">{errors.cvv}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-3">
                  Back
                </button>
                <button onClick={handleNext} className="btn-primary flex-1 justify-center py-3">
                  Review Order <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-white text-xl">Review & Confirm</h2>
              <div className="space-y-3 p-4 bg-gray-800/50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Name</span>
                  <span className="text-white font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white font-medium">{form.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Card</span>
                  <span className="text-white font-medium">•••• •••• •••• {form.card.slice(-4)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center py-3">
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="btn-primary flex-1 justify-center py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <>Confirm & Pay ${total.toFixed(2)}</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sticky top-24">
            <h3 className="font-bold text-white mb-4">Order ({items.length} item{items.length !== 1 ? 's' : ''})</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 truncate mr-3">{item.title}</span>
                  <span className="text-gray-200 font-medium flex-shrink-0">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-3 flex justify-between font-bold text-white">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
