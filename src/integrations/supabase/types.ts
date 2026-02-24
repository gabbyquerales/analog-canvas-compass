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
      activity_requirements: {
        Row: {
          activity_name: string
          additional_fee: number | null
          additional_lead_days: number | null
          description: string | null
          id: string
          insurance_impact: string | null
          requires_personnel: string | null
          slug: string
          triggers_complex_timeline: boolean | null
        }
        Insert: {
          activity_name: string
          additional_fee?: number | null
          additional_lead_days?: number | null
          description?: string | null
          id?: string
          insurance_impact?: string | null
          requires_personnel?: string | null
          slug: string
          triggers_complex_timeline?: boolean | null
        }
        Update: {
          activity_name?: string
          additional_fee?: number | null
          additional_lead_days?: number | null
          description?: string | null
          id?: string
          insurance_impact?: string | null
          requires_personnel?: string | null
          slug?: string
          triggers_complex_timeline?: boolean | null
        }
        Relationships: []
      }
      comparison_cities: {
        Row: {
          base_fee: number
          name: string
          notes: string | null
          permit_duration_days: number | null
          standard_lead_days: number
        }
        Insert: {
          base_fee: number
          name: string
          notes?: string | null
          permit_duration_days?: number | null
          standard_lead_days: number
        }
        Update: {
          base_fee?: number
          name?: string
          notes?: string | null
          permit_duration_days?: number | null
          standard_lead_days?: number
        }
        Relationships: []
      }
      jurisdictions: {
        Row: {
          application_deadline_time: string | null
          base_application_fee: number | null
          business_days_only: boolean | null
          cdtfa_name: string
          data_confidence_level: number | null
          filmla_served: boolean | null
          hold_harmless_required: boolean | null
          id: string
          insurance_additional_insured: string | null
          mandatory_review_fees: number | null
          micro_shoot_eligible: boolean | null
          micro_shoot_max_crew: number | null
          min_lead_days_complex: number | null
          min_lead_days_standard: number | null
          name: string
          office_closed_days: string[] | null
          permit_authority: string | null
          slug: string
          special_notes: string | null
          standard_filming_hours: string | null
        }
        Insert: {
          application_deadline_time?: string | null
          base_application_fee?: number | null
          business_days_only?: boolean | null
          cdtfa_name: string
          data_confidence_level?: number | null
          filmla_served?: boolean | null
          hold_harmless_required?: boolean | null
          id?: string
          insurance_additional_insured?: string | null
          mandatory_review_fees?: number | null
          micro_shoot_eligible?: boolean | null
          micro_shoot_max_crew?: number | null
          min_lead_days_complex?: number | null
          min_lead_days_standard?: number | null
          name: string
          office_closed_days?: string[] | null
          permit_authority?: string | null
          slug: string
          special_notes?: string | null
          standard_filming_hours?: string | null
        }
        Update: {
          application_deadline_time?: string | null
          base_application_fee?: number | null
          business_days_only?: boolean | null
          cdtfa_name?: string
          data_confidence_level?: number | null
          filmla_served?: boolean | null
          hold_harmless_required?: boolean | null
          id?: string
          insurance_additional_insured?: string | null
          mandatory_review_fees?: number | null
          micro_shoot_eligible?: boolean | null
          micro_shoot_max_crew?: number | null
          min_lead_days_complex?: number | null
          min_lead_days_standard?: number | null
          name?: string
          office_closed_days?: string[] | null
          permit_authority?: string | null
          slug?: string
          special_notes?: string | null
          standard_filming_hours?: string | null
        }
        Relationships: []
      }
      special_condition_areas: {
        Row: {
          area_name: string
          difficulty_score: number | null
          filmla_pdf_link: string | null
          id: string
          jurisdiction_id: string | null
          neighborhood_keyword: string | null
          restriction_summary: string | null
          zip_code: string | null
        }
        Insert: {
          area_name: string
          difficulty_score?: number | null
          filmla_pdf_link?: string | null
          id?: string
          jurisdiction_id?: string | null
          neighborhood_keyword?: string | null
          restriction_summary?: string | null
          zip_code?: string | null
        }
        Update: {
          area_name?: string
          difficulty_score?: number | null
          filmla_pdf_link?: string | null
          id?: string
          jurisdiction_id?: string | null
          neighborhood_keyword?: string | null
          restriction_summary?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_condition_areas_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_competitive_analysis: {
        Row: {
          base_fee: number | null
          cost_per_day: number | null
          name: string | null
          notes: string | null
          standard_lead_days: number | null
        }
        Insert: {
          base_fee?: number | null
          cost_per_day?: never
          name?: string | null
          notes?: string | null
          standard_lead_days?: number | null
        }
        Update: {
          base_fee?: number | null
          cost_per_day?: never
          name?: string | null
          notes?: string | null
          standard_lead_days?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
