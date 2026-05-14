import React from 'react'
import { Link } from 'react-router-dom'
import { Star, ShoppingCart, Music, FileText, BookOpen, Package, Clock, Zap } from 'lucide-react'
import { useCart } from '../context/CartContext'

const TYPE_ICONS = {
  'Full Track': Music,
  'Lyrics': FileText,
  'Sheet Music': BookOpen,
  'Bundle': Package,
}

const TYPE_COLORS = {
  'Full Track': 'bg-brand-900/60 text-brand-300 border-brand-800',
  'Lyrics': 'bg-amber-900/60 text-amber-300 border-amber-800',
  'Sheet Music': 'bg-emerald-900/60 text-emerald-300 border-emerald-800',
  'Bundle': 'bg-rose-900/60 text-rose-300 border-rose-800',
}

export default function ProductCard({ product, size = 'normal' }) {
  const { add, inCart } = useCart()
  const Icon = TYPE_ICONS[product.type] || Music
  const compact = size === 'compact'

  return (
    <div className="card group flex flex-col">
      {/* Cover art */}
      <div className={`relative bg-gradient-to-br ${product.coverGradient} ${compact ? 'h-36' : 'h-48'} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_white_0%,_transparent_70%)]" />
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
          <Icon size={28} className="text-white" />
        </div>
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {product.new && <span className="badge bg-brand-600 text-white"><Zap size={10} className="mr-0.5" />New</span>}
          {product.originalPrice && <span className="badge bg-red-700/80 text-red-100">Sale</span>}
        </div>
        {product.duration && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-gray-300">
            <Clock size={10} />
            {product.duration}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Type badge */}
        <span className={`badge border text-xs self-start ${TYPE_COLORS[product.type]}`}>
          <Icon size={10} className="mr-1" />
          {product.type}
        </span>

        {/* Title + artist */}
        <div>
          <Link to={`/product/${product.id}`} className="font-semibold text-white hover:text-brand-300 transition-colors line-clamp-1 text-sm sm:text-base">
            {product.title}
          </Link>
          <p className="text-gray-500 text-xs mt-0.5">{product.artist} · {product.genre}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className={i < Math.floor(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'} />
            ))}
          </div>
          <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
          <div>
            <span className="text-lg font-bold text-white">${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-600 line-through ml-2">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={() => add(product)}
            disabled={inCart(product.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              inCart(product.id)
                ? 'bg-gray-700 text-gray-400 cursor-default'
                : 'bg-brand-600 hover:bg-brand-500 text-white hover:-translate-y-0.5 shadow-md shadow-brand-900/40'
            }`}
          >
            <ShoppingCart size={13} />
            {inCart(product.id) ? 'In Cart' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
