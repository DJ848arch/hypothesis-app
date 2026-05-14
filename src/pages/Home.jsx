import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Music, FileText, BookOpen, Package, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react'
import { getFeaturedProducts, getNewProducts } from '../data/products'
import ProductCard from '../components/ProductCard'
import WaveformVisualizer from '../components/WaveformVisualizer'

const CATEGORIES = [
  {
    label: 'Full Tracks',
    desc: 'Production-ready AI-composed songs',
    icon: Music,
    color: 'from-brand-900 to-indigo-900',
    border: 'border-brand-800/50',
    link: '/browse?type=Full+Track',
    count: '340+ tracks',
  },
  {
    label: 'Lyrics',
    desc: 'Original lyrics for any genre',
    icon: FileText,
    color: 'from-amber-900 to-orange-900',
    border: 'border-amber-800/50',
    link: '/browse?type=Lyrics',
    count: '210+ sets',
  },
  {
    label: 'Sheet Music',
    desc: 'Beautifully engraved scores',
    icon: BookOpen,
    color: 'from-emerald-900 to-teal-900',
    border: 'border-emerald-800/50',
    link: '/browse?type=Sheet+Music',
    count: '180+ scores',
  },
  {
    label: 'Bundles',
    desc: 'Track + lyrics + sheet in one',
    icon: Package,
    color: 'from-rose-900 to-pink-900',
    border: 'border-rose-800/50',
    link: '/browse?type=Bundle',
    count: '60+ bundles',
  },
]

const FEATURES = [
  { icon: Sparkles, title: 'AI-Generated', desc: 'Every piece crafted by cutting-edge generative AI models, then curated by our music team.' },
  { icon: Shield, title: 'Royalty-Free', desc: 'Commercial license included. Use in videos, apps, games, or anywhere — forever.' },
  { icon: Zap, title: 'Instant Download', desc: 'High-quality WAV, PDF, MIDI delivered instantly after purchase.' },
  { icon: TrendingUp, title: 'New Daily', desc: 'Fresh AI compositions added every day across all genres and formats.' },
]

export default function Home() {
  const featured = getFeaturedProducts()
  const newItems = getNewProducts()

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-brand-950/40 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(113,35,247,0.25),transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-900/50 border border-brand-700/50 rounded-full px-4 py-1.5 text-sm text-brand-300 font-medium mb-8">
            <Sparkles size={14} />
            The Future of Music Commerce
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6">
            Buy AI Music,
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Lyrics & Scores
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover thousands of royalty-free, AI-generated tracks, lyrics, and sheet music.
            Perfect for creators, developers, musicians, and brands.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/browse" className="btn-primary text-lg px-8 py-3.5">
              Explore Marketplace <ArrowRight size={20} />
            </Link>
            <Link to="/browse?type=Bundle" className="btn-secondary text-lg px-8 py-3.5">
              View Bundles
            </Link>
          </div>

          {/* Waveform display */}
          <div className="flex justify-center items-center gap-3 opacity-60">
            <WaveformVisualizer playing={true} color="#8346ff" />
            <span className="text-gray-500 text-sm">AI-powered • Royalty-free • Instant delivery</span>
            <WaveformVisualizer playing={true} color="#8346ff" />
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[['800+', 'Products'], ['50k+', 'Downloads'], ['4.8★', 'Avg Rating'], ['100%', 'Royalty-Free']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-white">{val}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="section-heading">Browse by Category</h2>
          <p className="section-sub">Find exactly what your project needs</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CATEGORIES.map(({ label, desc, icon: Icon, color, border, link, count }) => (
            <Link
              key={label}
              to={link}
              className={`group relative rounded-2xl bg-gradient-to-br ${color} border ${border} p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">{label}</h3>
              <p className="text-white/60 text-sm mt-1">{desc}</p>
              <p className="text-white/40 text-xs mt-3 font-medium">{count}</p>
              <ArrowRight size={16} className="absolute bottom-5 right-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="section-heading">Featured</h2>
            <p className="section-sub">Handpicked by our curation team</p>
          </div>
          <Link to="/browse" className="btn-ghost text-brand-400 hover:text-brand-300">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* New arrivals */}
      {newItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-heading flex items-center gap-2">
                New Arrivals <span className="badge bg-brand-600 text-white text-xs">Fresh</span>
              </h2>
              <p className="section-sub">Just added to the marketplace</p>
            </div>
            <Link to="/browse?sort=new" className="btn-ghost text-brand-400 hover:text-brand-300">
              See all new <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newItems.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-gray-900/50 border-y border-gray-800 py-20 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading">Why SynthSell?</h2>
            <p className="section-sub">Everything you need for music production</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-900/60 border border-brand-800/50 flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-brand-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative rounded-3xl bg-gradient-to-r from-brand-900 via-violet-900 to-indigo-900 border border-brand-700/50 overflow-hidden p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(131,70,255,0.3),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-4xl font-black text-white mb-4">Start Creating Today</h2>
            <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of creators using AI music to power their projects. No subscription — pay only for what you need.
            </p>
            <Link to="/browse" className="btn-primary text-lg px-10 py-4">
              Browse All Products <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
