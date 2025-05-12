export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      fantasy_teams: {
        Row: {
          created_at: string | null
          eliminated: boolean | null
          eliminated_week: number | null
          id: string
          league_id: string | null
          name: string
          points: number | null
          rank: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          eliminated?: boolean | null
          eliminated_week?: number | null
          id?: string
          league_id?: string | null
          name: string
          points?: number | null
          rank?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          eliminated?: boolean | null
          eliminated_week?: number | null
          id?: string
          league_id?: string | null
          name?: string
          points?: number | null
          rank?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string | null
          league_id: string | null
          role: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          league_id?: string | null
          role: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          league_id?: string | null
          role?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string | null
          current_pick: number | null
          description: string | null
          draft_order: string[] | null
          draft_status: string | null
          entry_fee: number | null
          id: string
          image_url: string | null
          is_private: boolean
          max_members: number | null
          name: string
          owner_id: string | null
          private_code: string | null
          prize: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_pick?: number | null
          description?: string | null
          draft_order?: string[] | null
          draft_status?: string | null
          entry_fee?: number | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          max_members?: number | null
          name: string
          owner_id?: string | null
          private_code?: string | null
          prize?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_pick?: number | null
          description?: string | null
          draft_order?: string[] | null
          draft_status?: string | null
          entry_fee?: number | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          max_members?: number | null
          name?: string
          owner_id?: string | null
          private_code?: string | null
          prize?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_teams: {
        Row: {
          abbreviation: string
          eliminated: boolean | null
          elimination_week: number | null
          id: number
          logo_url: string | null
          name: string
        }
        Insert: {
          abbreviation: string
          eliminated?: boolean | null
          elimination_week?: number | null
          id?: number
          logo_url?: string | null
          name: string
        }
        Update: {
          abbreviation?: string
          eliminated?: boolean | null
          elimination_week?: number | null
          id?: number
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          date: string
          id: string
          league_id: string | null
          message: string
          read: boolean
          type: string
          user_id: string | null
        }
        Insert: {
          date?: string
          id?: string
          league_id?: string | null
          message: string
          read?: boolean
          type: string
          user_id?: string | null
        }
        Update: {
          date?: string
          id?: string
          league_id?: string | null
          message?: string
          read?: boolean
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          fantasy_points: number | null
          field_goals: number | null
          id: number
          interceptions: number | null
          passing_td: number | null
          passing_yards: number | null
          player_id: number | null
          receiving_td: number | null
          receiving_yards: number | null
          rushing_td: number | null
          rushing_yards: number | null
          sacks: number | null
          season: number
          tackles: number | null
          week: number
        }
        Insert: {
          fantasy_points?: number | null
          field_goals?: number | null
          id?: number
          interceptions?: number | null
          passing_td?: number | null
          passing_yards?: number | null
          player_id?: number | null
          receiving_td?: number | null
          receiving_yards?: number | null
          rushing_td?: number | null
          rushing_yards?: number | null
          sacks?: number | null
          season: number
          tackles?: number | null
          week: number
        }
        Update: {
          fantasy_points?: number | null
          field_goals?: number | null
          id?: number
          interceptions?: number | null
          passing_td?: number | null
          passing_yards?: number | null
          player_id?: number | null
          receiving_td?: number | null
          receiving_yards?: number | null
          rushing_td?: number | null
          rushing_yards?: number | null
          sacks?: number | null
          season?: number
          tackles?: number | null
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: number
          name: string
          nfl_team_id: number | null
          photo_url: string | null
          position: string
        }
        Insert: {
          id?: number
          name: string
          nfl_team_id?: number | null
          photo_url?: string | null
          position: string
        }
        Update: {
          id?: number
          name?: string
          nfl_team_id?: number | null
          photo_url?: string | null
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_nfl_team_id_fkey"
            columns: ["nfl_team_id"]
            isOneToOne: false
            referencedRelation: "nfl_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_moves: {
        Row: {
          acquired_type: string | null
          action: string | null
          created_at: string | null
          fantasy_team_id: string | null
          id: string
          player_id: number | null
          previous_team_id: string | null
          week: number | null
        }
        Insert: {
          acquired_type?: string | null
          action?: string | null
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: string
          player_id?: number | null
          previous_team_id?: string | null
          week?: number | null
        }
        Update: {
          acquired_type?: string | null
          action?: string | null
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: string
          player_id?: number | null
          previous_team_id?: string | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_moves_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_moves_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "roster_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_moves_previous_team_id_fkey"
            columns: ["previous_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_moves_previous_team_id_fkey"
            columns: ["previous_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
        ]
      }
      team_rosters: {
        Row: {
          acquired_type: string
          acquired_week: number
          fantasy_team_id: string | null
          id: number
          is_active: boolean | null
          player_id: number | null
          slot: string | null
          week: number
        }
        Insert: {
          acquired_type: string
          acquired_week: number
          fantasy_team_id?: string | null
          id?: number
          is_active?: boolean | null
          player_id?: number | null
          slot?: string | null
          week: number
        }
        Update: {
          acquired_type?: string
          acquired_week?: number
          fantasy_team_id?: string | null
          id?: number
          is_active?: boolean | null
          player_id?: number | null
          slot?: string | null
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "team_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          favorite_team: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          favorite_team?: string | null
          full_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          favorite_team?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      waiver_priority: {
        Row: {
          fantasy_team_id: string | null
          id: number
          league_id: string | null
          priority: number
          week: number
        }
        Insert: {
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          priority: number
          week: number
        }
        Update: {
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          priority?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiver_priority_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_priority_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "waiver_priority_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_requests: {
        Row: {
          created_at: string | null
          fantasy_team_id: string | null
          id: number
          league_id: string | null
          player_id: number | null
          status: string
          week: number
        }
        Insert: {
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          player_id?: number | null
          status: string
          week: number
        }
        Update: {
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          player_id?: number | null
          status?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiver_requests_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_requests_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "waiver_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          eliminated_nfl_team_id: number | null
          end_date: string | null
          id: number
          league_id: string | null
          number: number
          start_date: string | null
          status: string
        }
        Insert: {
          eliminated_nfl_team_id?: number | null
          end_date?: string | null
          id?: number
          league_id?: string | null
          number: number
          start_date?: string | null
          status: string
        }
        Update: {
          eliminated_nfl_team_id?: number | null
          end_date?: string | null
          id?: number
          league_id?: string | null
          number?: number
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "weeks_eliminated_nfl_team_id_fkey"
            columns: ["eliminated_nfl_team_id"]
            isOneToOne: false
            referencedRelation: "nfl_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weeks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_team_roster: {
        Row: {
          acquired_type: string | null
          fantasy_team_id: string | null
          is_active: boolean | null
          player_id: number | null
          player_name: string | null
          position: string | null
          week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "team_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      current_waiver_priority: {
        Row: {
          fantasy_team_id: string | null
          league_id: string | null
          priority: number | null
          team_name: string | null
          week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_priority_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_priority_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "waiver_priority_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_fantasy_team_ranking: {
        Row: {
          eliminated: boolean | null
          fantasy_team_id: string | null
          league_id: string | null
          owner_name: string | null
          points: number | null
          rank: number | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      player_weekly_stats: {
        Row: {
          fantasy_points: number | null
          player_id: number | null
          player_name: string | null
          position: string | null
          season: number | null
          week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
