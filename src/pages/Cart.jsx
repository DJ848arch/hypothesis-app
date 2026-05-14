import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Music, FileText, BookOpen, Package, ArrowRight, Tag } from 'lucide-react'
import { useCart } from '../context/CartContext'

const TYPE_ICONS = { 'Full Track': Music, 'Lyrics': FileText, 'Sheet Music': BookOpen, 'Bundle': Package }

export default function Cart() {
  const { items, remove, total } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart size={36} className="text-gray-600" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Discover thousands of AI-generated music products ready to license.</p>
        <Link to="/browse" className="btn-primary text-lg px-8 py-3.5">
          Browse Marketplace <ArrowRight size={20} />
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-white mb-8">
        Your Cart <span className="text-gray-600 text-2xl font-semibold">({items.length} item{items.length !== 1 ? 's' : ''})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const Icon = TYPE_ICONS[item.type] || Music
            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-5 hover:border-gray-700 transition-colors">
                {/* Cover */}
                <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${item.coverGradient} flex items-center justify-center`}>
                  <Icon size={22} className="text-white" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.id}`} className="font-semibold text-white hover:text-brand-300 transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                  <p className="text-gray-500 text-sm mt-0.5">{item.artist} · {item.type} · {item.genre}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.slice(0, 2).map(t => (
                      <span key={t} className="flex items-center gap-0.5 bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        <Tag size={9} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Price + remove */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-lg font-bold text-white">${item.price.toFixed(2)}</span>
                  <button
                    onClick={() => remove(item.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-900/40 hover:text-red-400 text-gray-600 flex items-center justify-center transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-white text-xl mb-5">Order Summary</h2>

            <div className="space-y-3 mb-5">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 truncate mr-4">{item.title}</span>
                  <span className="text-gray-300 font-medium flex-shrink-0">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-4 mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Subtotal</span><span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Processing fee</span><span>$0.00</span>
              </div>
              <div className="flex justify-between font-bold text-white text-lg">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full btn-primary justify-center py-3.5 text-base"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>

            <p className="text-center text-gray-600 text-xs mt-3">Secure checkout · Instant delivery</p>

            <div className="mt-5 pt-5 border-t border-gray-800">
              <Link to="/browse" className="btn-ghost w-full justify-center text-sm text-gray-400">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
