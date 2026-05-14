import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, Music, Search, Menu, X } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { items } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setMobileOpen(false)
    }
  }

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shadow-xl' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50 group-hover:bg-brand-500 transition-colors">
              <Music size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Synth<span className="text-brand-400">Sell</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={({ isActive }) => isActive ? 'btn-ghost text-white bg-gray-800' : 'btn-ghost'} end>
              Home
            </NavLink>
            <NavLink to="/browse" className={({ isActive }) => isActive ? 'btn-ghost text-white bg-gray-800' : 'btn-ghost'}>
              Browse
            </NavLink>
            <NavLink to="/browse?type=Full+Track" className="btn-ghost">Tracks</NavLink>
            <NavLink to="/browse?type=Lyrics" className="btn-ghost">Lyrics</NavLink>
            <NavLink to="/browse?type=Sheet+Music" className="btn-ghost">Sheet Music</NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-gray-800/70 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-40 focus:w-52 transition-all duration-300"
                />
              </div>
            </form>

            {/* Cart */}
            <Link to="/cart" className="relative btn-ghost">
              <ShoppingCart size={20} />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden btn-ghost"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950/98 border-b border-gray-800 px-4 pb-4 space-y-1">
          <form onSubmit={handleSearch} className="mb-3 pt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
          </form>
          {[['/', 'Home'], ['/browse', 'Browse All'], ['/browse?type=Full+Track', 'Tracks'], ['/browse?type=Lyrics', 'Lyrics'], ['/browse?type=Sheet+Music', 'Sheet Music']].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="block py-2 px-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
