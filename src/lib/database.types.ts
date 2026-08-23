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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          note?: string | null
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          company_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_types: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      cash_register_sessions: {
        Row: {
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
        }
        Insert: {
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount: number
        }
        Update: {
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sessions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organizations: {
        Row: {
          address: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          tax_regime: string | null
          trade_name: string | null
        }
        Insert: {
          address?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_organizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          company_id: string
          created_at: string
          credit_limit: number | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          company_id?: string
          created_at?: string
          credit_limit?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          company_id?: string
          created_at?: string
          credit_limit?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          amount: number
          cash_register_session_id: string | null
          client_id: string
          created_at: string
          debt_commitment_id: string | null
          id: string
          payment_method_id: string
          sale_id: string | null
        }
        Insert: {
          amount: number
          cash_register_session_id?: string | null
          client_id: string
          created_at?: string
          debt_commitment_id?: string | null
          id?: string
          payment_method_id: string
          sale_id?: string | null
        }
        Update: {
          amount?: number
          cash_register_session_id?: string | null
          client_id?: string
          created_at?: string
          debt_commitment_id?: string | null
          id?: string
          payment_method_id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_cash_register_session_id_fkey"
            columns: ["cash_register_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_debt_commitment_id_fkey"
            columns: ["debt_commitment_id"]
            isOneToOne: false
            referencedRelation: "debt_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          business_type_id: string | null
          created_at: string
          id: string
          name: string
          status: string
          subdomain: string
        }
        Insert: {
          business_type_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          subdomain: string
        }
        Update: {
          business_type_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          subdomain?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_commitments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          note: string | null
          parent_commitment_id: string | null
          resolved_at: string | null
          sale_id: string | null
          status: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
          parent_commitment_id?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
          parent_commitment_id?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_commitments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_commitments_parent_commitment_id_fkey"
            columns: ["parent_commitment_id"]
            isOneToOne: false
            referencedRelation: "debt_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_commitments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          employee_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          address: string | null
          company_id: string
          created_at: string
          curp: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hire_date: string | null
          id: string
          name: string
          notes: string | null
          nss: string | null
          pay_frequency: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          rfc: string | null
          salary: number | null
          termination_date: string | null
          user_id: string | null
          vacation_days_override: number | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          company_id?: string
          created_at?: string
          curp?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          name: string
          notes?: string | null
          nss?: string | null
          pay_frequency?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          rfc?: string | null
          salary?: number | null
          termination_date?: string | null
          user_id?: string | null
          vacation_days_override?: number | null
        }
        Update: {
          active?: boolean
          address?: string | null
          company_id?: string
          created_at?: string
          curp?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          nss?: string | null
          pay_frequency?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          rfc?: string | null
          salary?: number | null
          termination_date?: string | null
          user_id?: string | null
          vacation_days_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          company_id: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string
          cash_register_session_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          payment_method_id: string
          user_id: string
        }
        Insert: {
          amount: number
          branch_id: string
          cash_register_session_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          cash_register_session_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_register_session_id_fkey"
            columns: ["cash_register_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          note: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_deductions: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_deductions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "employee_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          is_cash: boolean
          is_credit: boolean
          is_system: boolean
          key: string
          label: string
        }
        Insert: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          is_cash?: boolean
          is_credit?: boolean
          is_system?: boolean
          key: string
          label: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          is_cash?: boolean
          is_credit?: boolean
          is_system?: boolean
          key?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string
          id: string
          key: string
        }
        Insert: {
          description: string
          id?: string
          key: string
        }
        Update: {
          description?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          branch_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          branch_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          branch_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category_id: string | null
          company_id: string
          cost: number
          created_at: string
          description: string | null
          id: string
          margin_percent: number | null
          min_stock: number | null
          name: string
          price: number
          sale_type: string
          sku: string | null
          unit: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          margin_percent?: number | null
          min_stock?: number | null
          name: string
          price?: number
          sale_type: string
          sku?: string | null
          unit: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          margin_percent?: number | null
          min_stock?: number | null
          name?: string
          price?: number
          sale_type?: string
          sku?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          product_id: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          supplier_id: string
          total: number
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          supplier_id: string
          total?: number
          user_id?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          commitment_date: string | null
          created_at: string
          id: string
          payment_method_id: string
          sale_id: string
        }
        Insert: {
          amount: number
          commitment_date?: string | null
          created_at?: string
          id?: string
          payment_method_id: string
          sale_id: string
        }
        Update: {
          amount?: number
          commitment_date?: string | null
          created_at?: string
          id?: string
          payment_method_id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          cash_register_id: string
          cash_register_session_id: string | null
          client_id: string | null
          created_at: string
          discount_amount: number
          id: string
          total: number
          user_id: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id: string
          cash_register_id: string
          cash_register_session_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          total?: number
          user_id?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string
          cash_register_id?: string
          cash_register_session_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          total?: number
          user_id?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cash_register_session_id_fkey"
            columns: ["cash_register_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          cash_register_session_id: string | null
          created_at: string
          id: string
          payment_method_id: string
          purchase_id: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          cash_register_session_id?: string | null
          created_at?: string
          id?: string
          payment_method_id: string
          purchase_id?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          cash_register_session_id?: string | null
          created_at?: string
          id?: string
          payment_method_id?: string
          purchase_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_cash_register_session_id_fkey"
            columns: ["cash_register_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          logo_url: string | null
          message: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          message?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branches: {
        Row: {
          branch_id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          user_id: string
        }
        Update: {
          branch_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string | null
          pin_hash: string | null
          role_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id: string
          name?: string | null
          pin_hash?: string | null
          role_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          pin_hash?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_periods: {
        Row: {
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          note: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          days: number
          employee_id: string
          end_date: string
          id?: string
          note?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          note?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      collect_debt:
        | {
            Args: {
              p_amount: number
              p_authorize_remainder?: boolean
              p_commitment_id: string
              p_new_due_date?: string
            }
            Returns: {
              amount: number
              client_id: string
              created_at: string
              due_date: string | null
              id: string
              note: string | null
              parent_commitment_id: string | null
              resolved_at: string | null
              sale_id: string | null
              status: string
            }
            SetofOptions: {
              from: "*"
              to: "debt_commitments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_amount: number
              p_authorize_remainder?: boolean
              p_cash_register_session_id?: string
              p_commitment_id: string
              p_new_due_date?: string
              p_payment_method_id: string
            }
            Returns: {
              amount: number
              client_id: string
              created_at: string
              due_date: string | null
              id: string
              note: string | null
              parent_commitment_id: string | null
              resolved_at: string | null
              sale_id: string | null
              status: string
            }
            SetofOptions: {
              from: "*"
              to: "debt_commitments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      current_company_id: { Args: never; Returns: string }
      has_permission: { Args: { permission_key: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
