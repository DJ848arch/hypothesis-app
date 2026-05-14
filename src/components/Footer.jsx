import React from 'react'
import { Link } from 'react-router-dom'
import { Music, Twitter, Github, Instagram } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Music size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">Synth<span className="text-brand-400">Sell</span></span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              The premier marketplace for AI-generated music, lyrics, and sheet music. Royalty-free, production-ready.
            </p>
            <div className="flex gap-3 mt-4">
              {[Twitter, Instagram, Github].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-brand-700 flex items-center justify-center transition-colors">
                  <Icon size={15} className="text-gray-400 hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Products</h3>
            <ul className="space-y-2.5">
              {[['Full Tracks', '/browse?type=Full+Track'], ['Lyrics', '/browse?type=Lyrics'], ['Sheet Music', '/browse?type=Sheet+Music'], ['Bundles', '/browse?type=Bundle']].map(([label, to]) => (
                <li key={label}><Link to={to} className="text-gray-500 hover:text-brand-400 text-sm transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Genres</h3>
            <ul className="space-y-2.5">
              {['Electronic', 'Ambient', 'Hip-Hop', 'Classical', 'Jazz', 'Lo-Fi'].map(g => (
                <li key={g}><Link to={`/browse?genre=${g}`} className="text-gray-500 hover:text-brand-400 text-sm transition-colors">{g}</Link></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Company</h3>
            <ul className="space-y-2.5">
              {[['About', '#'], ['Licensing', '#'], ['FAQ', '#'], ['Blog', '#'], ['Contact', '#']].map(([label, to]) => (
                <li key={label}><a href={to} className="text-gray-500 hover:text-brand-400 text-sm transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} SynthSell. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
