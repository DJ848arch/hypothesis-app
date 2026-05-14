import React, { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      if (state.items.find(i => i.id === action.product.id)) return state
      return { ...state, items: [...state.items, { ...action.product, qty: 1 }] }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const add = (product) => dispatch({ type: 'ADD', product })
  const remove = (id) => dispatch({ type: 'REMOVE', id })
  const clear = () => dispatch({ type: 'CLEAR' })
  const total = state.items.reduce((sum, i) => sum + i.price, 0)
  const inCart = (id) => !!state.items.find(i => i.id === id)

  return (
    <CartContext.Provider value={{ items: state.items, add, remove, clear, total, inCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
