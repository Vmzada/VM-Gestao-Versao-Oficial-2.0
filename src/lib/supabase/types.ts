export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          business_name: string
          owner_name: string
          phone: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          barcode: string | null
          sale_price: number
          cost_price: number | null
          stock_quantity: number
          min_stock_quantity: number
          unit: string
          photo_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      courts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'futebol' | 'volei'
          price_per_hour: number
          photo_url: string | null
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['courts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['courts']['Insert']>
        Relationships: []
      }
      court_bookings: {
        Row: {
          id: string
          court_id: string
          user_id: string
          customer_name: string
          customer_phone: string | null
          booking_date: string
          start_time: string
          end_time: string
          total_amount: number
          status: 'pendente' | 'confirmada' | 'cancelada' | 'concluida'
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['court_bookings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['court_bookings']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'court_bookings_court_id_fkey'
            columns: ['court_id']
            referencedRelation: 'courts'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          id: string
          user_id: string
          total_amount: number
          payment_method: string
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
        }
        Insert: Omit<Database['public']['Tables']['sale_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['sale_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
