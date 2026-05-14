import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Download, Music, ArrowRight } from 'lucide-react'

export default function OrderSuccess() {
  const ref = useRef(false)

  return (
    <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
      {/* Success icon */}
      <div className="relative inline-flex mb-8">
        <div className="w-28 h-28 rounded-full bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center">
          <CheckCircle size={52} className="text-emerald-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
          <Music size={16} className="text-white" />
        </div>
      </div>

      <h1 className="text-4xl font-black text-white mb-4">Order Complete!</h1>
      <p className="text-gray-400 text-lg mb-3">
        Thank you for your purchase. Your download links have been sent to your email.
      </p>
      <p className="text-gray-600 text-sm mb-10">
        All files are delivered as high-quality digital downloads with your commercial royalty-free license.
      </p>

      {/* Download CTA (demo) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-left">
        <div className="flex items-center gap-3 mb-4">
          <Download size={20} className="text-brand-400" />
          <span className="font-semibold text-white">Your Downloads Are Ready</span>
        </div>
        <div className="space-y-3">
          {['purchase_receipt.pdf', 'license_certificate.pdf', 'download_links.txt'].map(f => (
            <div key={f} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2.5">
              <span className="text-sm text-gray-400 font-mono">{f}</span>
              <button className="text-brand-400 hover:text-brand-300 text-xs font-semibold transition-colors">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/browse" className="btn-primary text-base px-8 py-3.5">
          Keep Shopping <ArrowRight size={18} />
        </Link>
        <Link to="/" className="btn-secondary text-base px-8 py-3.5">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
