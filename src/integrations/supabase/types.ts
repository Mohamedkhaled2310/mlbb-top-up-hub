export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'merchant' | 'customer'
          full_name: string | null
          phone: string | null
          region: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'merchant' | 'customer'
          full_name?: string | null
          phone?: string | null
          region?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'merchant' | 'customer'
          full_name?: string | null
          phone?: string | null
          region?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_accounts: {
        Row: {
          id: string
          user_id: string
          balance_egp: number
          margin_percent: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_egp?: number
          margin_percent?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_egp?: number
          margin_percent?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          id: string
          merchant_id: string
          amount: number
          entry_type: 'admin_credit' | 'order_debit' | 'refund' | 'adjustment'
          reference_type: string | null
          reference_id: string | null
          balance_after: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          amount: number
          entry_type: 'admin_credit' | 'order_debit' | 'refund' | 'adjustment'
          reference_type?: string | null
          reference_id?: string | null
          balance_after: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          amount?: number
          entry_type?: 'admin_credit' | 'order_debit' | 'refund' | 'adjustment'
          reference_type?: string | null
          reference_id?: string | null
          balance_after?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_ref: string
          user_id: string | null
          merchant_id: string | null
          player_id: string
          zone_id: string | null
          game_id: string
          region: string
          account_region: string | null
          status: 'pending' | 'processing' | 'success' | 'failed' | 'incomplete' | 'cancelled'
          total_egp: number
          items: Json
          fazer_transaction_id: string | null
          fazer_response: Json | null
          error_message: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_ref: string
          user_id?: string | null
          merchant_id?: string | null
          player_id: string
          zone_id?: string | null
          game_id: string
          region: string
          account_region?: string | null
          status?: 'pending' | 'processing' | 'success' | 'failed' | 'incomplete' | 'cancelled'
          total_egp: number
          items?: Json
          fazer_transaction_id?: string | null
          fazer_response?: Json | null
          error_message?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_ref?: string
          user_id?: string | null
          merchant_id?: string | null
          player_id?: string
          zone_id?: string | null
          game_id?: string
          region?: string
          account_region?: string | null
          status?: 'pending' | 'processing' | 'success' | 'failed' | 'incomplete' | 'cancelled'
          total_egp?: number
          items?: Json
          fazer_transaction_id?: string | null
          fazer_response?: Json | null
          error_message?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: number
          egp_rate: number
          fazer_balance: number | null
          fazer_balance_currency: string | null
          fazer_balance_updated_at: string | null
          packages_synced_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          egp_rate?: number
          fazer_balance?: number | null
          fazer_balance_currency?: string | null
          fazer_balance_updated_at?: string | null
          packages_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          egp_rate?: number
          fazer_balance?: number | null
          fazer_balance_currency?: string | null
          fazer_balance_updated_at?: string | null
          packages_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fazer_packages: {
        Row: {
          offer_id: string
          game_id: string
          category: string | null
          name: string
          diamonds: number | null
          bonus_diamonds: number | null
          currency_name: string | null
          cost_usd: number | null
          regions: Json | null
          active: boolean
          raw: Json | null
          updated_at: string
        }
        Insert: {
          offer_id: string
          game_id: string
          category?: string | null
          name: string
          diamonds?: number | null
          bonus_diamonds?: number | null
          currency_name?: string | null
          cost_usd?: number | null
          regions?: Json | null
          active?: boolean
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          offer_id?: string
          game_id?: string
          category?: string | null
          name?: string
          diamonds?: number | null
          bonus_diamonds?: number | null
          currency_name?: string | null
          cost_usd?: number | null
          regions?: Json | null
          active?: boolean
          raw?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_credit_merchant: {
        Args: { p_merchant_id: string; p_amount: number; p_note?: string | null; p_reference_type?: string | null; p_reference_id?: string | null }
        Returns: { merchant_id: string; new_balance: number; ledger_id: string }[]
      }
      debit_merchant_for_order: {
        Args: { p_merchant_id: string; p_amount: number; p_order_ref: string; p_note?: string | null }
        Returns: { merchant_id: string; new_balance: number; ledger_id: string }[]
      }
      admin_set_merchant_margin: {
        Args: { p_merchant_id: string; p_margin_percent: number }
        Returns: undefined
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = { public: { Enums: {} } } as const
