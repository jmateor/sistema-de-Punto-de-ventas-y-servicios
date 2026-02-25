export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          accion: string
          created_at: string
          detalles: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          accion: string
          created_at?: string
          detalles?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          accion?: string
          created_at?: string
          detalles?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          rnc_cedula: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          rnc_cedula?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          rnc_cedula?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          created_at: string
          fecha: string
          id: string
          notas: string | null
          proveedor_id: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          proveedor_id: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          proveedor_id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_negocio: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          formato_impresion: string | null
          id: string
          impresion_automatica: boolean
          itbis_rate: number
          logo_url: string | null
          mensaje_factura: string | null
          moneda: string
          nombre_comercial: string
          razon_social: string | null
          rnc: string | null
          telefono: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          formato_impresion?: string | null
          id?: string
          impresion_automatica?: boolean
          itbis_rate?: number
          logo_url?: string | null
          mensaje_factura?: string | null
          moneda?: string
          nombre_comercial?: string
          razon_social?: string | null
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          formato_impresion?: string | null
          id?: string
          impresion_automatica?: boolean
          itbis_rate?: number
          logo_url?: string | null
          mensaje_factura?: string | null
          moneda?: string
          nombre_comercial?: string
          razon_social?: string | null
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      detalle_compras: {
        Row: {
          cantidad: number
          compra_id: string
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad?: number
          compra_id: string
          id?: string
          precio_unitario: number
          producto_id: string
          subtotal?: number
        }
        Update: {
          cantidad?: number
          compra_id?: string
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "detalle_compras_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_compras_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_facturas: {
        Row: {
          cantidad: number
          factura_id: string
          id: string
          itbis: number
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad?: number
          factura_id: string
          id?: string
          itbis?: number
          precio_unitario: number
          producto_id: string
          subtotal?: number
        }
        Update: {
          cantidad?: number
          factura_id?: string
          id?: string
          itbis?: number
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "detalle_facturas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_facturas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cliente_id: string
          created_at: string
          descuento: number
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          itbis: number
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          ncf: string | null
          notas: string | null
          numero: string
          subtotal: number
          tipo_comprobante: string | null
          total: number
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descuento?: number
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          itbis?: number
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
          ncf?: string | null
          notas?: string | null
          numero: string
          subtotal?: number
          tipo_comprobante?: string | null
          total?: number
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descuento?: number
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          itbis?: number
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
          ncf?: string | null
          notas?: string | null
          numero?: string
          subtotal?: number
          tipo_comprobante?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ncf_secuencias: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          prefijo: string
          secuencia_actual: number
          secuencia_limite: number
          serie: string
          tipo_comprobante: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          prefijo?: string
          secuencia_actual?: number
          secuencia_limite?: number
          serie?: string
          tipo_comprobante: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          prefijo?: string
          secuencia_actual?: number
          secuencia_limite?: number
          serie?: string
          tipo_comprobante?: string
          user_id?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          categoria_id: string | null
          condiciones_garantia: string | null
          costo: number
          created_at: string
          descripcion: string | null
          garantia_descripcion: string | null
          id: string
          itbis_aplicable: boolean
          nombre: string
          precio: number
          stock: number
          stock_minimo: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria_id?: string | null
          condiciones_garantia?: string | null
          costo?: number
          created_at?: string
          descripcion?: string | null
          garantia_descripcion?: string | null
          id?: string
          itbis_aplicable?: boolean
          nombre: string
          precio?: number
          stock?: number
          stock_minimo?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria_id?: string | null
          condiciones_garantia?: string | null
          costo?: number
          created_at?: string
          descripcion?: string | null
          garantia_descripcion?: string | null
          id?: string
          itbis_aplicable?: boolean
          nombre?: string
          precio?: number
          stock?: number
          stock_minimo?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          rnc: string | null
          telefono: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          rnc?: string | null
          telefono?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          rnc?: string | null
          telefono?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { amount: number; p_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_ncf: { Args: { p_tipo: string; p_user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "cajero" | "contador"
      estado_factura: "activa" | "anulada"
      metodo_pago: "efectivo" | "tarjeta" | "transferencia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cajero", "contador"],
      estado_factura: ["activa", "anulada"],
      metodo_pago: ["efectivo", "tarjeta", "transferencia"],
    },
  },
} as const
