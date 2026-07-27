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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      execucoes_exercicio: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          execucao_treino_id: string
          exercicio_id: string
          id: string
          series: Json
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          execucao_treino_id: string
          exercicio_id: string
          id?: string
          series?: Json
          user_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          execucao_treino_id?: string
          exercicio_id?: string
          id?: string
          series?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_exercicio_execucao_treino_id_fkey"
            columns: ["execucao_treino_id"]
            isOneToOne: false
            referencedRelation: "execucoes_treino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_exercicio_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_treino: {
        Row: {
          criado_em: string
          data_fim: string | null
          data_inicio: string
          duracao_segundos: number | null
          id: string
          intensidade: number | null
          status: Database["public"]["Enums"]["status_execucao"]
          treino_id: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string
          duracao_segundos?: number | null
          id?: string
          intensidade?: number | null
          status?: Database["public"]["Enums"]["status_execucao"]
          treino_id: string
          user_id: string
        }
        Update: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string
          duracao_segundos?: number | null
          id?: string
          intensidade?: number | null
          status?: Database["public"]["Enums"]["status_execucao"]
          treino_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_treino_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bi_set_grupo_id: string | null
          carga_referencia_texto: string | null
          criado_em: string
          id: string
          imagem_ilustrativa: boolean
          imagem_url: string | null
          intervalo_segundos: number | null
          nome: string
          observacao: string | null
          ordem: number
          orientacoes: string | null
          repeticoes_texto: string | null
          tipo_repeticao: Database["public"]["Enums"]["tipo_repeticao"]
          treino_id: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bi_set_grupo_id?: string | null
          carga_referencia_texto?: string | null
          criado_em?: string
          id?: string
          imagem_ilustrativa?: boolean
          imagem_url?: string | null
          intervalo_segundos?: number | null
          nome: string
          observacao?: string | null
          ordem: number
          orientacoes?: string | null
          repeticoes_texto?: string | null
          tipo_repeticao?: Database["public"]["Enums"]["tipo_repeticao"]
          treino_id: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bi_set_grupo_id?: string | null
          carga_referencia_texto?: string | null
          criado_em?: string
          id?: string
          imagem_ilustrativa?: boolean
          imagem_url?: string | null
          intervalo_segundos?: number | null
          nome?: string
          observacao?: string | null
          ordem?: number
          orientacoes?: string | null
          repeticoes_texto?: string | null
          tipo_repeticao?: Database["public"]["Enums"]["tipo_repeticao"]
          treino_id?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      pausas_execucao: {
        Row: {
          execucao_treino_id: string
          id: string
          pausado_em: string
          retomado_em: string | null
          user_id: string
        }
        Insert: {
          execucao_treino_id: string
          id?: string
          pausado_em?: string
          retomado_em?: string | null
          user_id: string
        }
        Update: {
          execucao_treino_id?: string
          id?: string
          pausado_em?: string
          retomado_em?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pausas_execucao_execucao_treino_id_fkey"
            columns: ["execucao_treino_id"]
            isOneToOne: false
            referencedRelation: "execucoes_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      periodizacao_semanas: {
        Row: {
          esquema: string
          id: string
          semana: number
        }
        Insert: {
          esquema: string
          id?: string
          semana: number
        }
        Update: {
          esquema?: string
          id?: string
          semana?: number
        }
        Relationships: []
      }
      treinos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          letra: string
          mes_referencia: string
          nome: string
          ordem: number
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          letra: string
          mes_referencia: string
          nome: string
          ordem?: number
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          letra?: string
          mes_referencia?: string
          nome?: string
          ordem?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      status_execucao: "em_andamento" | "pausado" | "finalizado" | "cancelado"
      tipo_repeticao: "periodizacao" | "fixo"
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
      status_execucao: ["em_andamento", "pausado", "finalizado", "cancelado"],
      tipo_repeticao: ["periodizacao", "fixo"],
    },
  },
} as const
