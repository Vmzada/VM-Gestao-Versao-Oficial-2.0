'use client'

import { useMemo, useState } from 'react'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ProductForm, type ProductFormValues } from './product-form'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = useMemo(() => {
    const defaults = ['Bebidas', 'Alimentos', 'Doces', 'Salgados', 'Outros']
    const used = products.map((p) => p.category).filter((c) => !defaults.includes(c))
    return [...defaults, ...Array.from(new Set(used))]
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    )
  }, [products, search])

  const openNewDialog = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleSubmit = async (values: ProductFormValues) => {
    if (!user) return
    setIsSubmitting(true)

    const payload = {
      name: values.name,
      category: values.category,
      barcode: values.barcode || null,
      unit: values.unit,
      sale_price: values.salePrice,
      cost_price: values.costPrice > 0 ? values.costPrice : null,
      stock_quantity: values.stockQuantity,
      min_stock_quantity: values.minStockQuantity,
    }

    if (editingProduct) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
        .select()
        .single()

      setIsSubmitting(false)
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error?.message })
        return
      }
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)).sort((a, b) => a.name.localeCompare(b.name)))
      toast({ variant: 'success', title: 'Produto atualizado' })
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, user_id: user.id, is_active: true, photo_url: null })
        .select()
        .single()

      setIsSubmitting(false)
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Não foi possível cadastrar', description: error?.message })
        return
      }
      setProducts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      toast({ variant: 'success', title: 'Produto cadastrado' })
    }

    setDialogOpen(false)
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Excluir "${product.name}"? Essa ação não pode ser desfeita.`)) return

    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: error.message })
      return
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
    toast({ title: 'Produto excluído' })
  }

  const handleToggleActive = async (product: Product) => {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
      .select()
      .single()

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Não foi possível atualizar', description: error?.message })
      return
    }
    setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="mt-1 text-muted-foreground">Gerencie seu estoque e catálogo.</p>
        </div>
        <Button variant="gradient" onClick={openNewDialog}>
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, categoria ou código..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {products.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado.'}
            </p>
            {products.length === 0 && (
              <Button variant="gradient" onClick={openNewDialog}>
                <Plus className="h-4 w-4" />
                Cadastrar primeiro produto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const lowStock = product.stock_quantity <= product.min_stock_quantity
                  return (
                    <tr key={product.id} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && <div className="text-xs text-muted-foreground">{product.barcode}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                      <td className="px-4 py-3">{formatCurrency(product.sale_price)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(lowStock && 'font-semibold text-yellow-600 dark:text-yellow-400')}>
                          {product.stock_quantity} {product.unit}
                        </span>
                        {lowStock && (
                          <Badge variant="warning" className="ml-2">
                            Baixo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleActive(product)}>
                          <Badge variant={product.is_active ? 'success' : 'secondary'}>
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(product)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Hints that the table scrolls sideways on narrow screens, where
              Status/Ações get pushed off — hidden once there's room to show
              every column without scrolling. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-2xl bg-gradient-to-l from-card to-transparent sm:hidden" />
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Atualize as informações do produto.' : 'Preencha os dados do novo produto.'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
