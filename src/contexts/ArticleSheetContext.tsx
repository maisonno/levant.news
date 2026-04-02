'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Article } from '@/types/database'

interface ArticleSheetContextType {
  article: Article | null
  isOpen: boolean
  open: (article: Article) => void
  close: () => void
}

const ArticleSheetContext = createContext<ArticleSheetContextType>({
  article: null,
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function ArticleSheetProvider({ children }: { children: ReactNode }) {
  const [article, setArticle] = useState<Article | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = (a: Article) => {
    setArticle(a)
    setIsOpen(true)
  }
  const close = () => setIsOpen(false)

  return (
    <ArticleSheetContext.Provider value={{ article, isOpen, open, close }}>
      {children}
    </ArticleSheetContext.Provider>
  )
}

export function useArticleSheet() {
  return useContext(ArticleSheetContext)
}
