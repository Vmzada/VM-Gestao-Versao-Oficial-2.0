'use client'

import { useCallback, useMemo, useState } from 'react'
import { Minus, Plus, ScanLine, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarcodeScanner } from '@/components/barcode-scanner'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

type CartItem = {
  product: Product
  quantity: number
}

const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

export function PosClient({ initialProducts }: { initialProducts: Product[] }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(query) || p.barcode?.toLowerCase().includes(query)
    )
  }, [products, search])

  const cartQuantity = (productId: string) => cart.find((item) => item.product.id === productId)?.quantity ?? 0

  // Reads/writes cart state through the functional setState updater (instead
  // of the `cart` closure) so this callback's identity doesn't change every
  // time the cart changes — it's passed to BarcodeScanner, whose effect tears
  // down and rebuilds the camera stream whenever `onDetected` changes.
  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        const currentQty = existing?.quantity ?? 0
        if (currentQty >= product.stock_quantity) {
          toast({ variant: 'destructive', title: 'Estoque insuficiente', description: `Só há ${product.stock_quantity} ${product.unit} em estoque.` })
          return prev
        }
        if (existing) {
          return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        }
        return [...prev, { product, quantity: 1 }]
      })
    },
    [toast]
  )

  const changeQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => i.product.id !== productId)
      if (newQty > item.product.stock_quantity) {
        toast({ variant: 'destructive', title: 'Estoque insuficiente', description: `Só há ${item.product.stock_quantity} ${item.product.unit} em estoque.` })
        return prev
      }
      return prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleBarcodeDetected = useCallback(
    (code: string) => {
      const product = products.find((p) => p.barcode === code)
      if (!product) {
        toast({ variant: 'destructive', title: 'Produto não encontrado', description: `Nenhum produto com o código ${code}.` })
        return
      }
      addToCart(product)
    },
    [products, addToCart, toast]
  )

  const total = cart.reduce((sum, item) => sum + item.product.sale_price * item.quantity, 0)

  const finalizeSale = async () => {
    if (!user || cart.length === 0) return
    setIsFinishing(true)

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({ user_id: user.id, total_amount: total, payment_method: paymentMethod, status: 'concluida' })
      .select()
      .single()

    if (saleError || !sale) {
      setIsFinishing(false)
      toast({ variant: 'destructive', title: 'Não foi possível registrar a venda', description: saleError?.message })
      return
    }

    const { error: itemsError } = await supabase.from('sale_items').insert(
      cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        subtotal: item.product.sale_price * item.quantity,
      }))
    )

    if (itemsError) {
      setIsFinishing(false)
      toast({ variant: 'destructive', title: 'Venda registrada com erro nos itens', description: itemsError.message })
      return
    }

    const stockResults = await Promise.all(
      cart.map(async (item) => {
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id)
        return { item, error }
      })
    )

    const failedStockUpdates = stockResults.filter((r) => r.error)
    const updatedIds = new Set(stockResults.filter((r) => !r.error).map((r) => r.item.product.id))

    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id)
        return cartItem && updatedIds.has(p.id) ? { ...p, stock_quantity: p.stock_quantity - cartItem.quantity } : p
      })
    )

    setIsFinishing(false)
    setCart([])

    if (failedStockUpdates.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Venda registrada, mas o estoque não foi totalmente atualizado',
        description: `Ajuste manualmente o estoque de ${failedStockUpdates.length} produto(s).`,
      })
    } else {
      toast({ variant: 'success', title: 'Venda finalizada!', description: formatCurrency(total) })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-bold">Frente de Caixa</h1>
          <p className="mt-1 text-muted-foreground">Selecione os produtos para registrar a venda.</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código de barras..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                {products.length === 0 ? 'Nenhum produto ativo cadastrado.' : 'Nenhum produto encontrado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock_quantity <= 0
              const inCart = cartQuantity(product.id)
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(product)}
                  className={cn(
                    'relative rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'
                  )}
                >
                  {inCart > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {inCart}
                    </span>
                  )}
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                  <p className="mt-2 font-bold text-primary">{formatCurrency(product.sale_price)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {outOfStock ? 'Sem estoque' : `${product.stock_quantity} ${product.unit} disponíveis`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Carrinho</h2>
            </div>

            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carrinho vazio</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li key={item.product.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.product.sale_price)} un.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon-sm" onClick={() => changeQuantity(item.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon-sm" onClick={() => changeQuantity(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(total)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={cart.length === 0 || isFinishing}
                onClick={finalizeSale}
              >
                {isFinishing ? 'Finalizando...' : 'Finalizar venda'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleBarcodeDetected} />
    </div>
  )
}
