'use client'

import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Plus, ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarcodeScanner } from '@/components/barcode-scanner'
import { PhotoUpload } from '@/components/photo-upload'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const productSchema = z.object({
  name: z.string().min(2, 'Informe o nome do produto'),
  category: z.string().min(2, 'Informe a categoria'),
  barcode: z.string().optional(),
  unit: z.string().min(1, 'Informe a unidade'),
  salePrice: z.coerce.number().positive('Informe um preço válido'),
  costPrice: z.coerce.number().nonnegative('Valor inválido'),
  stockQuantity: z.coerce.number().nonnegative('Quantidade inválida'),
  minStockQuantity: z.coerce.number().nonnegative('Quantidade inválida'),
})

export type ProductFormValues = z.infer<typeof productSchema> & { photoUrl: string | null }

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct', 'fardo']
const NEW_CATEGORY = '__new__'

export function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  product?: Product | null
  categories: string[]
  onSubmit: (values: ProductFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(product?.photo_url ?? null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  // Categories confirmed through the inline "add category" flow (or the
  // product's own category, if editing one the parent's list doesn't know
  // about yet) — merged in so the Select always has a matching item to
  // display, instead of showing blank because SelectValue can't resolve a
  // label for a value with no corresponding SelectItem.
  const [extraCategories, setExtraCategories] = useState<string[]>(product?.category ? [product.category] : [])
  const allCategories = useMemo(() => {
    const merged = [...categories]
    for (const c of extraCategories) if (!merged.includes(c)) merged.push(c)
    return merged
  }, [categories, extraCategories])
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof productSchema>, unknown, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          category: product.category,
          barcode: product.barcode ?? '',
          unit: product.unit,
          salePrice: product.sale_price,
          costPrice: product.cost_price ?? 0,
          stockQuantity: product.stock_quantity,
          minStockQuantity: product.min_stock_quantity,
        }
      : { unit: 'un', category: 'Bebidas', stockQuantity: 0, minStockQuantity: 0, costPrice: 0 },
  })

  const unit = watch('unit')
  const category = watch('category')

  const submitWithPhoto = (values: z.output<typeof productSchema>) => onSubmit({ ...values, photoUrl })

  const confirmNewCategory = () => {
    const trimmed = newCategory.trim()
    if (!trimmed) return
    setExtraCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setValue('category', trimmed, { shouldValidate: true })
    setIsAddingCategory(false)
  }

  // Memoized so BarcodeScanner's camera-init effect (keyed on `onDetected`'s
  // identity) doesn't tear down and restart the stream on every keystroke —
  // `setValue` is stable across renders per react-hook-form.
  const handleBarcodeDetected = useCallback(
    (code: string) => setValue('barcode', code, { shouldValidate: true }),
    [setValue]
  )

  return (
    <>
      <form onSubmit={handleSubmit(submitWithPhoto)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Foto (opcional)</Label>
            <PhotoUpload folder="products" value={photoUrl} onChange={setPhotoUrl} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Coca-Cola Lata 350ml" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <Input
                  id="category"
                  autoFocus
                  placeholder="Nome da categoria"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmNewCategory()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={confirmNewCategory}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingCategory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={category}
                onValueChange={(value) => {
                  if (value === NEW_CATEGORY) {
                    setNewCategory('')
                    setIsAddingCategory(true)
                    return
                  }
                  setValue('category', value, { shouldValidate: true })
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY}>
                    <span className="flex items-center gap-1.5 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar categoria
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <Select value={unit} onValueChange={(value) => setValue('unit', value, { shouldValidate: true })}>
              <SelectTrigger id="unit">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="barcode">Código de barras</Label>
            <div className="flex gap-2">
              <Input id="barcode" placeholder="Opcional" {...register('barcode')} />
              <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrice">Preço de venda</Label>
            <Input id="salePrice" type="number" step="0.01" min="0" {...register('salePrice')} />
            {errors.salePrice && <p className="text-xs text-destructive">{errors.salePrice.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Preço de custo</Label>
            <Input id="costPrice" type="number" step="0.01" min="0" placeholder="Opcional" {...register('costPrice')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stockQuantity">Estoque atual</Label>
            <Input id="stockQuantity" type="number" step="1" min="0" {...register('stockQuantity')} />
            {errors.stockQuantity && <p className="text-xs text-destructive">{errors.stockQuantity.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="minStockQuantity">Estoque mínimo</Label>
            <Input id="minStockQuantity" type="number" step="1" min="0" {...register('minStockQuantity')} />
            {errors.minStockQuantity && <p className="text-xs text-destructive">{errors.minStockQuantity.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </div>
      </form>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleBarcodeDetected}
      />
    </>
  )
}
