import React, { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Star, ShoppingCart, Check, ArrowLeft, Music, FileText, BookOpen, Package,
  Play, Pause, Volume2, Clock, Tag, Download, Shield, ChevronRight,
} from 'lucide-react'
import { getProductById, products } from '../data/products'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import WaveformVisualizer from '../components/WaveformVisualizer'

const TYPE_ICONS = { 'Full Track': Music, 'Lyrics': FileText, 'Sheet Music': BookOpen, 'Bundle': Package }

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = getProductById(id)
  const { add, inCart } = useCart()
  const [playing, setPlaying] = useState(false)
  const [added, setAdded] = useState(false)
  const audioRef = useRef(null)

  if (!product) {
    return (
      <div className="pt-32 text-center">
        <p className="text-2xl font-bold text-white mb-4">Product not found</p>
        <Link to="/browse" className="btn-primary">Back to Browse</Link>
      </div>
    )
  }

  const Icon = TYPE_ICONS[product.type] || Music
  const related = products.filter(p => p.id !== product.id && (p.genre === product.genre || p.type === product.type)).slice(0, 4)

  const handleAddToCart = () => {
    add(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    add(product)
    navigate('/checkout')
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-gray-300 transition-colors">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-gray-300 transition-colors">Browse</Link>
        <ChevronRight size={14} />
        <span className="text-gray-300 truncate">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: cover + preview */}
        <div>
          {/* Cover */}
          <div className={`relative rounded-3xl bg-gradient-to-br ${product.coverGradient} aspect-square max-w-md mx-auto lg:mx-0 flex items-center justify-center overflow-hidden shadow-2xl shadow-brand-950/50`}>
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_white_0%,_transparent_70%)]" />
            <div className="relative flex flex-col items-center gap-6">
              <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
                <Icon size={52} className="text-white" />
              </div>
              {/* Play button for tracks */}
              {(product.type === 'Full Track' || product.type === 'Bundle') && (
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all hover:scale-110 shadow-xl"
                >
                  {playing ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" />}
                </button>
              )}
              <WaveformVisualizer playing={playing} color="rgba(255,255,255,0.7)" />
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {product.new && <span className="badge bg-brand-600 text-white">New</span>}
              {product.originalPrice && <span className="badge bg-red-600/80 text-white">Sale</span>}
            </div>
          </div>

          {/* Audio player (hidden, for demo) */}
          {(product.type === 'Full Track' || product.type === 'Bundle') && (
            <div className="mt-4 p-4 bg-gray-900 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <Volume2 size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">30-second preview</span>
                {product.duration && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={12} /> {product.duration} full
                  </span>
                )}
              </div>
              {/* Simulated waveform scrubber */}
              <div className="relative h-12 bg-gray-800 rounded-xl overflow-hidden cursor-pointer" onClick={togglePlay}>
                <div className="absolute inset-0 flex items-center px-3 gap-0.5">
                  {Array.from({ length: 60 }).map((_, i) => {
                    const h = [30, 70, 50, 90, 60, 80, 40, 95, 55, 75][i % 10]
                    return (
                      <div key={i} style={{ height: `${h}%` }}
                        className={`flex-1 rounded-full transition-colors ${playing && i < 15 ? 'bg-brand-500' : 'bg-gray-600'}`}
                      />
                    )
                  })}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full ${playing ? 'bg-brand-600/80' : 'bg-gray-700/80'} flex items-center justify-center backdrop-blur-sm transition-colors`}>
                    {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                  </div>
                </div>
              </div>
              <audio ref={audioRef} onEnded={() => setPlaying(false)} />
            </div>
          )}

          {/* What's included */}
          <div className="mt-6 p-5 bg-gray-900 rounded-2xl border border-gray-800">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Download size={16} className="text-brand-400" /> What's Included
            </h3>
            <ul className="space-y-2">
              {product.includes.map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Check size={14} className="text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: info + purchase */}
        <div>
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="badge bg-brand-900/60 border border-brand-700 text-brand-300 text-sm px-3 py-1">
              <Icon size={12} className="mr-1.5" /> {product.type}
            </span>
            <span className="badge bg-gray-800 text-gray-400 text-sm px-3 py-1">
              {product.genre}
            </span>
          </div>

          <h1 className="text-4xl font-black text-white mb-2">{product.title}</h1>
          <p className="text-gray-400 text-lg mb-5">by <span className="text-gray-300 font-medium">{product.artist}</span></p>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} className={i < Math.floor(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'} />
              ))}
            </div>
            <span className="font-semibold text-white">{product.rating}</span>
            <span className="text-gray-500 text-sm">({product.reviews} reviews)</span>
          </div>

          {/* Tech details */}
          {(product.bpm || product.key || product.duration) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {product.bpm && (
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-gray-500">BPM</span>
                  <span className="font-bold text-white">{product.bpm}</span>
                </div>
              )}
              {product.key && (
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-gray-500">Key</span>
                  <span className="font-bold text-white">{product.key}</span>
                </div>
              )}
              {product.duration && (
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl px-4 py-2.5 text-sm">
                  <Clock size={14} className="text-gray-500" />
                  <span className="font-bold text-white">{product.duration}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-gray-400 leading-relaxed mb-6">{product.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {product.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-end gap-3 mb-5">
              <span className="text-4xl font-black text-white">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <div className="mb-1">
                  <span className="text-gray-600 line-through text-lg">${product.originalPrice.toFixed(2)}</span>
                  <span className="ml-2 text-emerald-400 text-sm font-semibold">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% off
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                className="w-full btn-primary justify-center py-3.5 text-base"
              >
                Buy Now — ${product.price.toFixed(2)}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={inCart(product.id)}
                className={`w-full justify-center py-3.5 text-base rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 ${
                  inCart(product.id) || added
                    ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-400 cursor-default'
                    : 'btn-secondary'
                }`}
              >
                {inCart(product.id) || added ? (
                  <><Check size={18} /> In Cart</>
                ) : (
                  <><ShoppingCart size={18} /> Add to Cart</>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
              <Shield size={14} className="text-brand-500" />
              Commercial royalty-free license · Instant download · Secure checkout
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="section-heading mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
