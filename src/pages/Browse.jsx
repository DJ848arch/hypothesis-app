import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { products, GENRES, TYPES } from '../data/products'
import ProductCard from '../components/ProductCard'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'new', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [genre, setGenre] = useState(searchParams.get('genre') || 'All')
  const [type, setType] = useState(searchParams.get('type') || 'All')
  const [sort, setSort] = useState(searchParams.get('sort') === 'new' ? 'new' : 'featured')
  const [maxPrice, setMaxPrice] = useState(50)

  useEffect(() => {
    const q = searchParams.get('q')
    const g = searchParams.get('genre')
    const t = searchParams.get('type')
    const s = searchParams.get('sort')
    if (q) setQuery(q)
    if (g) setGenre(g)
    if (t) setType(t)
    if (s === 'new') setSort('new')
  }, [searchParams])

  const filtered = useMemo(() => {
    let list = [...products]
    if (query) list = list.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.artist.toLowerCase().includes(query.toLowerCase()) || p.tags.some(t => t.includes(query.toLowerCase())))
    if (genre !== 'All') list = list.filter(p => p.genre === genre)
    if (type !== 'All') list = list.filter(p => p.type === type)
    list = list.filter(p => p.price <= maxPrice)
    switch (sort) {
      case 'new': list = list.filter(p => p.new).concat(list.filter(p => !p.new)); break
      case 'price-asc': list.sort((a, b) => a.price - b.price); break
      case 'price-desc': list.sort((a, b) => b.price - a.price); break
      case 'rating': list.sort((a, b) => b.rating - a.rating); break
      default: list = list.filter(p => p.featured).concat(list.filter(p => !p.featured))
    }
    return list
  }, [query, genre, type, sort, maxPrice])

  const activeFilters = [
    query && { label: `"${query}"`, clear: () => setQuery('') },
    genre !== 'All' && { label: genre, clear: () => setGenre('All') },
    type !== 'All' && { label: type, clear: () => setType('All') },
    maxPrice < 50 && { label: `Under $${maxPrice}`, clear: () => setMaxPrice(50) },
  ].filter(Boolean)

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white">Browse Marketplace</h1>
        <p className="text-gray-400 mt-2">Explore {products.length}+ AI-generated music products</p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tracks, lyrics, artists..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input appearance-none pr-9 cursor-pointer min-w-[160px]"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`btn-secondary gap-2 ${showFilters ? 'border-brand-600 text-brand-400' : ''}`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Genre */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Genre</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${genre === g ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${type === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">
              Max Price: <span className="text-brand-400">${maxPrice}</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>$1</span><span>$50</span>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(({ label, clear }) => (
            <button
              key={label}
              onClick={clear}
              className="flex items-center gap-1.5 bg-brand-900/60 border border-brand-700 text-brand-300 text-xs px-3 py-1.5 rounded-full hover:bg-brand-800/60 transition-colors"
            >
              {label} <X size={12} />
            </button>
          ))}
          <button onClick={() => { setQuery(''); setGenre('All'); setType('All'); setMaxPrice(50) }} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="text-gray-500 text-sm mb-6">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        {activeFilters.length > 0 ? ' matching your filters' : ''}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <button onClick={() => { setQuery(''); setGenre('All'); setType('All'); setMaxPrice(50) }} className="btn-primary">
            Reset filters
          </button>
        </div>
      )}
    </div>
  )
}
