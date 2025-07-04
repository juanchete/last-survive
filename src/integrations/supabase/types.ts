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
      admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string | null
          id: string
          reason: string | null
          target_league_id: string | null
          target_player_id: number | null
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_league_id?: string | null
          target_player_id?: number | null
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_league_id?: string | null
          target_player_id?: number | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_league_id_fkey"
            columns: ["target_league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_teams: {
        Row: {
          created_at: string | null
          eliminated: boolean | null
          eliminated_week: number | null
          id: string
          league_id: string | null
          mvp_wins: number | null
          name: string
          points: number | null
          rank: number | null
          total_earnings: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          eliminated?: boolean | null
          eliminated_week?: number | null
          id?: string
          league_id?: string | null
          mvp_wins?: number | null
          name: string
          points?: number | null
          rank?: number | null
          total_earnings?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          eliminated?: boolean | null
          eliminated_week?: number | null
          id?: string
          league_id?: string | null
          mvp_wins?: number | null
          name?: string
          points?: number | null
          rank?: number | null
          total_earnings?: number | null
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
      league_invitations: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          invite_code: string
          invitee_email: string
          inviter_id: string
          league_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          invite_code: string
          invitee_email: string
          inviter_id: string
          league_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          invitee_email?: string
          inviter_id?: string
          league_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_invitations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
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
          owner_plays: boolean | null
          private_code: string | null
          prize: string | null
          start_date: string | null
          status: string | null
          trade_deadline_week: number | null
          trade_review_period_hours: number | null
          trade_veto_enabled: boolean | null
          trade_veto_threshold: number | null
          waiver_deadline_day: number | null
          waiver_deadline_hour: number | null
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
          owner_plays?: boolean | null
          private_code?: string | null
          prize?: string | null
          start_date?: string | null
          status?: string | null
          trade_deadline_week?: number | null
          trade_review_period_hours?: number | null
          trade_veto_enabled?: boolean | null
          trade_veto_threshold?: number | null
          waiver_deadline_day?: number | null
          waiver_deadline_hour?: number | null
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
          owner_plays?: boolean | null
          private_code?: string | null
          prize?: string | null
          start_date?: string | null
          status?: string | null
          trade_deadline_week?: number | null
          trade_review_period_hours?: number | null
          trade_veto_enabled?: boolean | null
          trade_veto_threshold?: number | null
          waiver_deadline_day?: number | null
          waiver_deadline_hour?: number | null
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
      lowest_team: {
        Row: {
          team_id: string | null
          team_name: string | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          team_id?: string | null
          team_name?: string | null
          total_points?: number | null
          user_id?: string | null
        }
        Update: {
          team_id?: string | null
          team_name?: string | null
          total_points?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      trade_items: {
        Row: {
          created_at: string | null
          id: string
          player_id: number
          team_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: number
          team_id: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: number
          team_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "trade_items_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_votes: {
        Row: {
          id: string
          reason: string | null
          trade_id: string
          vote: string
          voted_at: string | null
          voter_team_id: string
        }
        Insert: {
          id?: string
          reason?: string | null
          trade_id: string
          vote: string
          voted_at?: string | null
          voter_team_id: string
        }
        Update: {
          id?: string
          reason?: string | null
          trade_id?: string
          vote?: string
          voted_at?: string | null
          voter_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_votes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_votes_voter_team_id_fkey"
            columns: ["voter_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_votes_voter_team_id_fkey"
            columns: ["voter_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          executed_at: string | null
          expires_at: string | null
          id: string
          league_id: string
          notes: string | null
          proposed_at: string | null
          proposer_team_id: string
          responded_at: string | null
          response_notes: string | null
          season: number
          status: string
          target_team_id: string
          veto_deadline: string | null
          week: number
        }
        Insert: {
          created_at?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          league_id: string
          notes?: string | null
          proposed_at?: string | null
          proposer_team_id: string
          responded_at?: string | null
          response_notes?: string | null
          season?: number
          status?: string
          target_team_id: string
          veto_deadline?: string | null
          week?: number
        }
        Update: {
          created_at?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          league_id?: string
          notes?: string | null
          proposed_at?: string | null
          proposer_team_id?: string
          responded_at?: string | null
          response_notes?: string | null
          season?: number
          status?: string
          target_team_id?: string
          veto_deadline?: string | null
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_proposer_team_id_fkey"
            columns: ["proposer_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_proposer_team_id_fkey"
            columns: ["proposer_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "trades_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          banned: boolean | null
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          created_at: string | null
          email: string
          favorite_team: string | null
          full_name: string
          id: string
          role: string | null
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean | null
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          created_at?: string | null
          email: string
          favorite_team?: string | null
          full_name: string
          id?: string
          role?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean | null
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          created_at?: string | null
          email?: string
          favorite_team?: string | null
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          drop_player_id: number | null
          fantasy_team_id: string | null
          id: number
          league_id: string | null
          player_id: number | null
          processed_at: string | null
          status: string
          week: number
        }
        Insert: {
          created_at?: string | null
          drop_player_id?: number | null
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          player_id?: number | null
          processed_at?: string | null
          status: string
          week: number
        }
        Update: {
          created_at?: string | null
          drop_player_id?: number | null
          fantasy_team_id?: string | null
          id?: number
          league_id?: string | null
          player_id?: number | null
          processed_at?: string | null
          status?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiver_requests_drop_player_id_fkey"
            columns: ["drop_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
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
      weekly_mvp_history: {
        Row: {
          created_at: string | null
          earnings: number | null
          fantasy_team_id: string
          id: string
          league_id: string
          points: number
          season: number
          week: number
        }
        Insert: {
          created_at?: string | null
          earnings?: number | null
          fantasy_team_id: string
          id?: string
          league_id: string
          points: number
          season?: number
          week: number
        }
        Update: {
          created_at?: string | null
          earnings?: number | null
          fantasy_team_id?: string
          id?: string
          league_id?: string
          points?: number
          season?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_mvp_history_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_mvp_history_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "league_fantasy_team_ranking"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "weekly_mvp_history_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
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
      accept_test_trade: {
        Args: { trade_id: string }
        Returns: Json
      }
      add_player_to_roster: {
        Args: {
          admin_id: string
          team_id: string
          player_id: number
          slot: string
          week_num: number
          acquired_type?: string
          reason?: string
        }
        Returns: Json
      }
      ban_user: {
        Args: { admin_id: string; target_user_id: string; reason?: string }
        Returns: Json
      }
      calculate_team_weekly_score: {
        Args: { team_id: string; week_num: number; season_year?: number }
        Returns: number
      }
      check_roster_limits: {
        Args: { team_id: string; week_num: number; position_to_add: string }
        Returns: Json
      }
      cleanup_duplicate_fantasy_teams: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_test_trades: {
        Args: { league_id: string }
        Returns: Json
      }
      create_missing_fantasy_teams: {
        Args: { league_id: string }
        Returns: Json
      }
      debug_waiver_processing: {
        Args: { league_id: string; week_num?: number }
        Returns: Json
      }
      edit_player_stats: {
        Args: {
          admin_id: string
          p_player_id: number
          week_num: number
          season_year: number
          new_fantasy_points: number
          reason?: string
        }
        Returns: Json
      }
      edit_roster_player: {
        Args: {
          admin_id: string
          roster_id: number
          new_player_id: number
          new_slot?: string
          reason?: string
        }
        Returns: Json
      }
      execute_trade: {
        Args: { trade_id: string }
        Returns: Json
      }
      get_active_players_in_league: {
        Args: { league_id: string }
        Returns: {
          user_id: string
          full_name: string
          email: string
          role: string
          team_id: string
          team_name: string
          eliminated: boolean
        }[]
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_nfl_week: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_lowest_scoring_team: {
        Args: { league_id: string; week_num: number; season_year?: number }
        Returns: {
          team_id: string
          team_name: string
          user_id: string
          total_points: number
        }[]
      }
      get_team_roster_admin: {
        Args: { team_id: string; week_num?: number }
        Returns: {
          roster_id: number
          player_id: number
          player_name: string
          player_position: string
          slot: string
          is_active: boolean
          acquired_type: string
          acquired_week: number
          fantasy_points: number
          nfl_team_name: string
        }[]
      }
      get_waiver_deadline: {
        Args: { league_id: string }
        Returns: Json
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      process_all_weekly_eliminations: {
        Args: { week_num: number; season_year?: number }
        Returns: Json
      }
      process_expired_waivers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_league_waivers: {
        Args: { league_id: string; week_num: number; season_year?: number }
        Returns: Json
      }
      process_league_waivers_simple: {
        Args: { league_id: string }
        Returns: Json
      }
      process_trade_veto_votes: {
        Args: { trade_id: string }
        Returns: Json
      }
      process_waiver_claim: {
        Args: { request_id: number }
        Returns: Json
      }
      process_weekly_elimination: {
        Args: { league_id: string; week_num: number; season_year?: number }
        Returns: Json
      }
      process_weekly_elimination_with_mvp: {
        Args: { league_id: string; week_num: number; season_year?: number }
        Returns: Json
      }
      process_weekly_mvp: {
        Args: {
          target_league_id: string
          week_num: number
          season_year?: number
        }
        Returns: Json
      }
      recalculate_team_scores: {
        Args: {
          admin_id: string
          team_id: string
          week_num: number
          season_year: number
        }
        Returns: Json
      }
      refresh_league_points: {
        Args: { target_league_id: string; target_week?: number }
        Returns: Json
      }
      remove_player_from_roster: {
        Args: { admin_id: string; roster_id: number; reason?: string }
        Returns: Json
      }
      reset_all_waiver_priorities: {
        Args: { new_week: number }
        Returns: undefined
      }
      reset_league_eliminations: {
        Args: { league_id: string }
        Returns: Json
      }
      setup_elimination_test_league: {
        Args: { target_league_id: string }
        Returns: Json
      }
      setup_realistic_test_rosters: {
        Args: { target_league_id: string }
        Returns: Json
      }
      setup_test_trade: {
        Args: {
          league_id: string
          proposer_team_name?: string
          target_team_name?: string
        }
        Returns: Json
      }
      should_user_have_team: {
        Args: { user_id: string; league_id: string }
        Returns: boolean
      }
      simulate_elimination_for_testing: {
        Args: { league_id: string; week_num?: number; season_year?: number }
        Returns: Json
      }
      simulate_trade_veto: {
        Args: { trade_id: string; veto_percentage?: number }
        Returns: Json
      }
      test_complete_trading_flow: {
        Args: { league_id: string }
        Returns: Json
      }
      unban_user: {
        Args: { admin_id: string; target_user_id: string; reason?: string }
        Returns: Json
      }
      update_team_rankings: {
        Args: { league_id: string }
        Returns: undefined
      }
      validate_trade_proposal: {
        Args: {
          league_id: string
          proposer_team_id: string
          target_team_id: string
          proposer_player_ids: number[]
          target_player_ids: number[]
          current_week: number
        }
        Returns: Json
      }
      validate_waiver_request: {
        Args: {
          team_id: string
          player_to_add_id: number
          player_to_drop_id: number
          week_num: number
        }
        Returns: Json
      }
      verify_team_scores: {
        Args: { target_league_id: string; week_num?: number }
        Returns: Json
      }
      verify_user: {
        Args: { admin_id: string; target_user_id: string }
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
