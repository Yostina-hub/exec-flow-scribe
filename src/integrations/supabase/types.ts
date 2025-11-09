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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          ai_generated: boolean | null
          assigned_to: string
          blocked_reason: string | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          due_date: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_level: number | null
          eta: string | null
          id: string
          last_nudge_sent: string | null
          meeting_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          source_proposal_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          status_detail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          assigned_to: string
          blocked_reason?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          eta?: string | null
          id?: string
          last_nudge_sent?: string | null
          meeting_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          source_proposal_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          status_detail?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          assigned_to?: string
          blocked_reason?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          eta?: string | null
          id?: string
          last_nudge_sent?: string | null
          meeting_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          source_proposal_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          status_detail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "guba_task_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      action_status_updates: {
        Row: {
          action_id: string
          comment: string | null
          created_at: string | null
          eta: string | null
          id: string
          new_status: Database["public"]["Enums"]["action_status"] | null
          new_status_detail: string | null
          old_status: Database["public"]["Enums"]["action_status"] | null
          old_status_detail: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          comment?: string | null
          created_at?: string | null
          eta?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["action_status"] | null
          new_status_detail?: string | null
          old_status?: Database["public"]["Enums"]["action_status"] | null
          old_status_detail?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          comment?: string | null
          created_at?: string | null
          eta?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["action_status"] | null
          new_status_detail?: string | null
          old_status?: Database["public"]["Enums"]["action_status"] | null
          old_status_detail?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_status_updates_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_id: string
          order_index: number
          presenter_id: string | null
          status: Database["public"]["Enums"]["agenda_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id: string
          order_index: number
          presenter_id?: string | null
          status?: Database["public"]["Enums"]["agenda_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id?: string
          order_index?: number
          presenter_id?: string | null
          status?: Database["public"]["Enums"]["agenda_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_preferences: {
        Row: {
          created_at: string
          gemini_api_key: string | null
          id: string
          openai_api_key: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          openai_api_key?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          openai_api_key?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          meeting_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meeting_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meeting_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_workflows: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string | null
          created_by: string
          footer_template: string | null
          header_template: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          organization_name: string
          updated_at: string | null
          watermark_text: string | null
        }
        Insert: {
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string | null
          created_by: string
          footer_template?: string | null
          header_template?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          organization_name: string
          updated_at?: string | null
          watermark_text?: string | null
        }
        Update: {
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string | null
          created_by?: string
          footer_template?: string | null
          header_template?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          organization_name?: string
          updated_at?: string | null
          watermark_text?: string | null
        }
        Relationships: []
      }
      breakout_room_assignments: {
        Row: {
          assigned_at: string
          breakout_room_id: string
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          breakout_room_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          breakout_room_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakout_room_assignments_breakout_room_id_fkey"
            columns: ["breakout_room_id"]
            isOneToOne: false
            referencedRelation: "breakout_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      breakout_rooms: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          meeting_id: string
          room_name: string
          room_number: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          meeting_id: string
          room_name: string
          room_number: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          meeting_id?: string
          room_name?: string
          room_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakout_rooms_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          answered_at: string | null
          call_duration_seconds: number | null
          call_sid: string | null
          call_status: string
          call_type: string
          ended_at: string | null
          id: string
          message_log_id: string | null
          metadata: Json | null
          phone_number: string
          recording_url: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          answered_at?: string | null
          call_duration_seconds?: number | null
          call_sid?: string | null
          call_status?: string
          call_type: string
          ended_at?: string | null
          id?: string
          message_log_id?: string | null
          metadata?: Json | null
          phone_number: string
          recording_url?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          answered_at?: string | null
          call_duration_seconds?: number | null
          call_sid?: string | null
          call_status?: string
          call_type?: string
          ended_at?: string | null
          id?: string
          message_log_id?: string | null
          metadata?: Json | null
          phone_number?: string
          recording_url?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: false
            referencedRelation: "message_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          commitment_text: string
          committed_at: string
          committed_by: string | null
          created_at: string | null
          drift_score: number | null
          due_date: string | null
          fulfillment_evidence: string | null
          id: string
          meeting_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          commitment_text: string
          committed_at: string
          committed_by?: string | null
          created_at?: string | null
          drift_score?: number | null
          due_date?: string | null
          fulfillment_evidence?: string | null
          id?: string
          meeting_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          commitment_text?: string
          committed_at?: string
          committed_by?: string | null
          created_at?: string | null
          drift_score?: number | null
          due_date?: string | null
          fulfillment_evidence?: string | null
          id?: string
          meeting_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_settings: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          setting_type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      confirmation_requests: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          meeting_id: string
          responded_at: string | null
          response: string | null
          start_time: string
          status: string
          transcript_segment: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          meeting_id: string
          responded_at?: string | null
          response?: string | null
          start_time: string
          status?: string
          transcript_segment: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          meeting_id?: string
          responded_at?: string | null
          response?: string | null
          start_time?: string
          status?: string
          transcript_segment?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      context_capsules: {
        Row: {
          generated_at: string | null
          id: string
          key_points: string[] | null
          meeting_id: string
          reading_time_seconds: number | null
          role_context: string | null
          suggested_contribution: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          key_points?: string[] | null
          meeting_id: string
          reading_time_seconds?: number | null
          role_context?: string | null
          suggested_contribution?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          key_points?: string[] | null
          meeting_id?: string
          reading_time_seconds?: number | null
          role_context?: string | null
          suggested_contribution?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_capsules_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      countersignatures: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          notes: string | null
          required_role: string
          section_sensitivity_id: string
          signature_request_id: string
          signed_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          required_role: string
          section_sensitivity_id: string
          signature_request_id: string
          signed_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          required_role?: string
          section_sensitivity_id?: string
          signature_request_id?: string
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "countersignatures_section_sensitivity_id_fkey"
            columns: ["section_sensitivity_id"]
            isOneToOne: false
            referencedRelation: "section_sensitivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countersignatures_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcomes: {
        Row: {
          created_at: string | null
          created_by: string | null
          decision_id: string
          id: string
          impact_score: number | null
          measured_at: string
          metrics: Json | null
          notes: string | null
          outcome_description: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          decision_id: string
          id?: string
          impact_score?: number | null
          measured_at: string
          metrics?: Json | null
          notes?: string | null
          outcome_description: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          decision_id?: string
          id?: string
          impact_score?: number | null
          measured_at?: string
          metrics?: Json | null
          notes?: string | null
          outcome_description?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_timeline_segments: {
        Row: {
          audio_url: string | null
          cited_data: Json | null
          context_after: string | null
          context_before: string | null
          created_at: string | null
          decision_id: string
          draft_snapshot: Json | null
          id: string
          meeting_id: string
          segment_end: string
          segment_start: string
          video_timestamp: string | null
        }
        Insert: {
          audio_url?: string | null
          cited_data?: Json | null
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          decision_id: string
          draft_snapshot?: Json | null
          id?: string
          meeting_id: string
          segment_end: string
          segment_start: string
          video_timestamp?: string | null
        }
        Update: {
          audio_url?: string | null
          cited_data?: Json | null
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          decision_id?: string
          draft_snapshot?: Json | null
          id?: string
          meeting_id?: string
          segment_end?: string
          segment_start?: string
          video_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_timeline_segments_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_timeline_segments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          context: string | null
          created_at: string
          created_by: string
          decision_text: string
          id: string
          meeting_id: string
          timestamp: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by: string
          decision_text: string
          id?: string
          meeting_id: string
          timestamp?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string
          decision_text?: string
          id?: string
          meeting_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_records: {
        Row: {
          created_at: string | null
          cryptographic_hash: string
          delegated_at: string | null
          delegated_from: string
          delegated_to: string
          id: string
          reason_code: string
          reason_details: string | null
          signature_request_id: string
        }
        Insert: {
          created_at?: string | null
          cryptographic_hash: string
          delegated_at?: string | null
          delegated_from: string
          delegated_to: string
          id?: string
          reason_code: string
          reason_details?: string | null
          signature_request_id: string
        }
        Update: {
          created_at?: string | null
          cryptographic_hash?: string
          delegated_at?: string | null
          delegated_from?: string
          delegated_to?: string
          id?: string
          reason_code?: string
          reason_details?: string | null
          signature_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_records_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          head_user_id: string | null
          id: string
          level: number
          name: string
          name_am: string | null
          parent_department_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          head_user_id?: string | null
          id?: string
          level?: number
          name: string
          name_am?: string | null
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          head_user_id?: string | null
          id?: string
          level?: number
          name?: string
          name_am?: string | null
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_channels: {
        Row: {
          channel_type: string
          config: Json
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          channel_type: string
          config?: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string
          config?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_profiles: {
        Row: {
          audience_type: string
          created_at: string | null
          created_by: string
          custom_filters: Json | null
          description: string | null
          id: string
          include_sensitive_sections: boolean | null
          name: string
          redact_financial: boolean | null
          redact_hr: boolean | null
          redact_legal: boolean | null
        }
        Insert: {
          audience_type: string
          created_at?: string | null
          created_by: string
          custom_filters?: Json | null
          description?: string | null
          id?: string
          include_sensitive_sections?: boolean | null
          name: string
          redact_financial?: boolean | null
          redact_hr?: boolean | null
          redact_legal?: boolean | null
        }
        Update: {
          audience_type?: string
          created_at?: string | null
          created_by?: string
          custom_filters?: Json | null
          description?: string | null
          id?: string
          include_sensitive_sections?: boolean | null
          name?: string
          redact_financial?: boolean | null
          redact_hr?: boolean | null
          redact_legal?: boolean | null
        }
        Relationships: []
      }
      distribution_recipients: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_recipients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "distribution_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_distributions: {
        Row: {
          channel_id: string
          created_at: string | null
          delivery_confirmation: Json | null
          document_version_id: string
          error_message: string | null
          id: string
          recipients: Json
          sent_at: string | null
          status: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          delivery_confirmation?: Json | null
          document_version_id: string
          error_message?: string | null
          id?: string
          recipients?: Json
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          delivery_confirmation?: Json | null
          document_version_id?: string
          error_message?: string | null
          id?: string
          recipients?: Json
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_distributions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "distribution_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_distributions_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          content: string
          content_format: string
          created_at: string | null
          created_by: string
          document_type: string
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_published: boolean | null
          meeting_id: string
          metadata: Json | null
          published_at: string | null
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          content_format?: string
          created_at?: string | null
          created_by: string
          document_type: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          meeting_id: string
          metadata?: Json | null
          published_at?: string | null
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          content_format?: string
          created_at?: string | null
          created_by?: string
          document_type?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          meeting_id?: string
          metadata?: Json | null
          published_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_sync_settings: {
        Row: {
          auto_backup_enabled: boolean | null
          auto_save_minutes_as_docs: boolean | null
          auto_sync_notebooks: boolean | null
          auto_upload_recordings: boolean | null
          backup_folder_id: string | null
          created_at: string
          default_folder_id: string | null
          google_drive_enabled: boolean | null
          id: string
          teledrive_access_token: string | null
          teledrive_api_host: string | null
          teledrive_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_backup_enabled?: boolean | null
          auto_save_minutes_as_docs?: boolean | null
          auto_sync_notebooks?: boolean | null
          auto_upload_recordings?: boolean | null
          backup_folder_id?: string | null
          created_at?: string
          default_folder_id?: string | null
          google_drive_enabled?: boolean | null
          id?: string
          teledrive_access_token?: string | null
          teledrive_api_host?: string | null
          teledrive_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_backup_enabled?: boolean | null
          auto_save_minutes_as_docs?: boolean | null
          auto_sync_notebooks?: boolean | null
          auto_upload_recordings?: boolean | null
          backup_folder_id?: string | null
          created_at?: string
          default_folder_id?: string | null
          google_drive_enabled?: boolean | null
          id?: string
          teledrive_access_token?: string | null
          teledrive_api_host?: string | null
          teledrive_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_sync_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_distributions: {
        Row: {
          distribution_profile_id: string | null
          error_message: string | null
          id: string
          pdf_generation_id: string
          recipients: Json
          sent_at: string | null
          sent_by: string
          status: string
        }
        Insert: {
          distribution_profile_id?: string | null
          error_message?: string | null
          id?: string
          pdf_generation_id: string
          recipients: Json
          sent_at?: string | null
          sent_by: string
          status?: string
        }
        Update: {
          distribution_profile_id?: string | null
          error_message?: string | null
          id?: string
          pdf_generation_id?: string
          recipients?: Json
          sent_at?: string | null
          sent_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_distributions_distribution_profile_id_fkey"
            columns: ["distribution_profile_id"]
            isOneToOne: false
            referencedRelation: "distribution_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_distributions_pdf_generation_id_fkey"
            columns: ["pdf_generation_id"]
            isOneToOne: false
            referencedRelation: "pdf_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_analysis: {
        Row: {
          analyzed_at: string | null
          confidence: number | null
          created_at: string | null
          emotion_score: number
          energy_level: string | null
          id: string
          meeting_id: string
          primary_emotion: string
          secondary_emotions: Json | null
          sentiment: string | null
          speaker_name: string | null
          transcription_id: string
        }
        Insert: {
          analyzed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          emotion_score: number
          energy_level?: string | null
          id?: string
          meeting_id: string
          primary_emotion: string
          secondary_emotions?: Json | null
          sentiment?: string | null
          speaker_name?: string | null
          transcription_id: string
        }
        Update: {
          analyzed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          emotion_score?: number
          energy_level?: string | null
          id?: string
          meeting_id?: string
          primary_emotion?: string
          secondary_emotions?: Json | null
          sentiment?: string | null
          speaker_name?: string | null
          transcription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotional_analysis_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotional_analysis_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_config: {
        Row: {
          created_at: string | null
          id: string
          role_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      escalation_rules: {
        Row: {
          created_at: string | null
          escalate_to: string
          id: string
          is_active: boolean | null
          priority_level: number
          rule_name: string
          updated_at: string | null
          wait_time_minutes: number
        }
        Insert: {
          created_at?: string | null
          escalate_to: string
          id?: string
          is_active?: boolean | null
          priority_level: number
          rule_name: string
          updated_at?: string | null
          wait_time_minutes?: number
        }
        Update: {
          created_at?: string | null
          escalate_to?: string
          id?: string
          is_active?: boolean | null
          priority_level?: number
          rule_name?: string
          updated_at?: string | null
          wait_time_minutes?: number
        }
        Relationships: []
      }
      event_categories: {
        Row: {
          color_hex: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color_hex: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      event_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          exception_date: string
          id: string
          is_cancelled: boolean | null
          meeting_id: string
          override_description: string | null
          override_end_time: string | null
          override_fields: Json | null
          override_location: string | null
          override_start_time: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exception_date: string
          id?: string
          is_cancelled?: boolean | null
          meeting_id: string
          override_description?: string | null
          override_end_time?: string | null
          override_fields?: Json | null
          override_location?: string | null
          override_start_time?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exception_date?: string
          id?: string
          is_cancelled?: boolean | null
          meeting_id?: string
          override_description?: string | null
          override_end_time?: string | null
          override_fields?: Json | null
          override_location?: string | null
          override_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_exceptions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_sent: boolean | null
          meeting_id: string
          offset_minutes: number
          sent_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_sent?: boolean | null
          meeting_id: string
          offset_minutes: number
          sent_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_sent?: boolean | null
          meeting_id?: string
          offset_minutes?: number
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notifications_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_briefs: {
        Row: {
          action_status_summary: Json | null
          brief_content: Json
          created_for: string | null
          generated_at: string | null
          id: string
          key_insights: string[] | null
          meeting_id: string
          recommended_focus: string[] | null
          risk_alerts: string[] | null
          sources: Json | null
        }
        Insert: {
          action_status_summary?: Json | null
          brief_content: Json
          created_for?: string | null
          generated_at?: string | null
          id?: string
          key_insights?: string[] | null
          meeting_id: string
          recommended_focus?: string[] | null
          risk_alerts?: string[] | null
          sources?: Json | null
        }
        Update: {
          action_status_summary?: Json | null
          brief_content?: Json
          created_for?: string | null
          generated_at?: string | null
          id?: string
          key_insights?: string[] | null
          meeting_id?: string
          recommended_focus?: string[] | null
          risk_alerts?: string[] | null
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_briefs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_coach_hints: {
        Row: {
          created_at: string | null
          expires_at: string | null
          hint_message: string
          hint_type: string
          id: string
          is_read: boolean | null
          meeting_id: string
          priority: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          hint_message: string
          hint_type: string
          id?: string
          is_read?: boolean | null
          meeting_id: string
          priority?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          hint_message?: string
          hint_type?: string
          id?: string
          is_read?: boolean | null
          meeting_id?: string
          priority?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_coach_hints_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_checks: {
        Row: {
          check_result: Json
          created_at: string | null
          end_time: string
          id: string
          meeting_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string
          status: string
          transcript_segment: string
        }
        Insert: {
          check_result: Json
          created_at?: string | null
          end_time: string
          id?: string
          meeting_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time: string
          status?: string
          transcript_segment: string
        }
        Update: {
          check_result?: Json
          created_at?: string | null
          end_time?: string
          id?: string
          meeting_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string
          status?: string
          transcript_segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_checks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      guba_feedback: {
        Row: {
          accepted: boolean
          created_at: string | null
          created_by: string
          feedback_reason: string | null
          id: string
          meeting_id: string
          metadata: Json | null
          proposal_id: string
          task_id: string
        }
        Insert: {
          accepted: boolean
          created_at?: string | null
          created_by: string
          feedback_reason?: string | null
          id?: string
          meeting_id: string
          metadata?: Json | null
          proposal_id: string
          task_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string | null
          created_by?: string
          feedback_reason?: string | null
          id?: string
          meeting_id?: string
          metadata?: Json | null
          proposal_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guba_feedback_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guba_feedback_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "guba_task_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      guba_learning_metrics: {
        Row: {
          calculated_at: string | null
          id: string
          metric_data: Json
          metric_type: string
          period_end: string
          period_start: string
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          metric_data?: Json
          metric_type: string
          period_end: string
          period_start: string
        }
        Update: {
          calculated_at?: string | null
          id?: string
          metric_data?: Json
          metric_type?: string
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      guba_notification_log: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string
          status: string
          task_id: string
          user_id: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guba_notification_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      guba_notification_preferences: {
        Row: {
          created_at: string
          due_date_1h: boolean | null
          due_date_24h: boolean | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          new_assignment: boolean | null
          overdue_escalation: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reassignment: boolean | null
          sms_enabled: boolean | null
          status_change: boolean | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          due_date_1h?: boolean | null
          due_date_24h?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          new_assignment?: boolean | null
          overdue_escalation?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reassignment?: boolean | null
          sms_enabled?: boolean | null
          status_change?: boolean | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          due_date_1h?: boolean | null
          due_date_24h?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          new_assignment?: boolean | null
          overdue_escalation?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reassignment?: boolean | null
          sms_enabled?: boolean | null
          status_change?: boolean | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      guba_settings: {
        Row: {
          auto_assign_enabled: boolean | null
          auto_generate_on_minutes: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          preferred_language: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_assign_enabled?: boolean | null
          auto_generate_on_minutes?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          preferred_language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_assign_enabled?: boolean | null
          auto_generate_on_minutes?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          preferred_language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guba_task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          dependency_type: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guba_task_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guba_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guba_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      guba_task_proposals: {
        Row: {
          created_at: string | null
          created_by: string | null
          generated_tasks: Json
          id: string
          language: string | null
          meeting_id: string | null
          selected_task_ids: string[] | null
          source_id: string | null
          source_type: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          generated_tasks: Json
          id?: string
          language?: string | null
          meeting_id?: string | null
          selected_task_ids?: string[] | null
          source_id?: string | null
          source_type: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          generated_tasks?: Json
          id?: string
          language?: string | null
          meeting_id?: string | null
          selected_task_ids?: string[] | null
          source_id?: string | null
          source_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guba_task_proposals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      guba_task_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          template_data: Json
          updated_at: string
          use_count: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          template_data: Json
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      guest_access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          meeting_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          meeting_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          meeting_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_access_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          content: string
          created_at: string
          id: string
          meeting_id: string
          tagged_by: string
          timestamp: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          tagged_by: string
          timestamp: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          tagged_by?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      interruption_catchups: {
        Row: {
          created_at: string | null
          id: string
          key_changes: Json
          left_at: string
          meeting_id: string
          missed_actions: string[] | null
          missed_decisions: string[] | null
          returned_at: string | null
          status: string
          suggested_questions: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_changes: Json
          left_at: string
          meeting_id: string
          missed_actions?: string[] | null
          missed_decisions?: string[] | null
          returned_at?: string | null
          status?: string
          suggested_questions?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_changes?: Json
          left_at?: string
          meeting_id?: string
          missed_actions?: string[] | null
          missed_decisions?: string[] | null
          returned_at?: string | null
          status?: string
          suggested_questions?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interruption_catchups_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      jitsi_recordings: {
        Row: {
          created_at: string
          ended_at: string | null
          error_message: string | null
          id: string
          meeting_id: string
          recording_id: string
          recording_url: string | null
          room_name: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          meeting_id: string
          recording_id: string
          recording_url?: string | null
          room_name: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          meeting_id?: string
          recording_id?: string
          recording_url?: string | null
          room_name?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jitsi_recordings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      jitsi_settings: {
        Row: {
          api_token: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_token: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_token?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      knowledge_entities: {
        Row: {
          created_at: string | null
          entity_data: Json | null
          entity_name: string
          entity_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_data?: Json | null
          entity_name: string
          entity_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_data?: Json | null
          entity_name?: string
          entity_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_relationships: {
        Row: {
          created_at: string | null
          decision_id: string | null
          from_entity_id: string
          id: string
          meeting_id: string | null
          relationship_data: Json | null
          relationship_type: string
          strength: number | null
          to_entity_id: string
        }
        Insert: {
          created_at?: string | null
          decision_id?: string | null
          from_entity_id: string
          id?: string
          meeting_id?: string | null
          relationship_data?: Json | null
          relationship_type: string
          strength?: number | null
          to_entity_id: string
        }
        Update: {
          created_at?: string | null
          decision_id?: string | null
          from_entity_id?: string
          id?: string
          meeting_id?: string | null
          relationship_data?: Json | null
          relationship_type?: string
          strength?: number | null
          to_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_relationships_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_relationships_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          attendance_confirmed: boolean | null
          attended: boolean | null
          can_speak: boolean | null
          created_at: string
          id: string
          is_speaking: boolean | null
          last_spoke_at: string | null
          meeting_id: string
          microphone_granted_at: string | null
          responded_at: string | null
          response_status: string | null
          role: string | null
          speaking_duration_seconds: number | null
          speaking_requested_at: string | null
          user_id: string
        }
        Insert: {
          attendance_confirmed?: boolean | null
          attended?: boolean | null
          can_speak?: boolean | null
          created_at?: string
          id?: string
          is_speaking?: boolean | null
          last_spoke_at?: string | null
          meeting_id: string
          microphone_granted_at?: string | null
          responded_at?: string | null
          response_status?: string | null
          role?: string | null
          speaking_duration_seconds?: number | null
          speaking_requested_at?: string | null
          user_id: string
        }
        Update: {
          attendance_confirmed?: boolean | null
          attended?: boolean | null
          can_speak?: boolean | null
          created_at?: string
          id?: string
          is_speaking?: boolean | null
          last_spoke_at?: string | null
          meeting_id?: string
          microphone_granted_at?: string | null
          responded_at?: string | null
          response_status?: string | null
          role?: string | null
          speaking_duration_seconds?: number | null
          speaking_requested_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_meeting_attendees_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bookmarks: {
        Row: {
          bookmark_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          meeting_id: string
          timestamp_seconds: number
          title: string
        }
        Insert: {
          bookmark_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          meeting_id: string
          timestamp_seconds: number
          title: string
        }
        Update: {
          bookmark_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          meeting_id?: string
          timestamp_seconds?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bookmarks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_chapters: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          meeting_id: string
          start_transcription_id: string | null
          timestamp: unknown
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          meeting_id: string
          start_transcription_id?: string | null
          timestamp: unknown
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          meeting_id?: string
          start_transcription_id?: string | null
          timestamp?: unknown
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_chapters_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_chapters_start_transcription_id_fkey"
            columns: ["start_transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          meeting_id: string
          role: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          meeting_id: string
          role: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          meeting_id?: string
          role?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_chat_messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_drive_files: {
        Row: {
          auto_generated: boolean | null
          created_at: string
          drive_file_id: string
          drive_file_name: string
          drive_file_type: string
          drive_file_url: string
          file_category: string | null
          file_size: number | null
          id: string
          meeting_id: string
          metadata: Json | null
          mime_type: string | null
          storage_provider: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string
          drive_file_id: string
          drive_file_name: string
          drive_file_type: string
          drive_file_url: string
          file_category?: string | null
          file_size?: number | null
          id?: string
          meeting_id: string
          metadata?: Json | null
          mime_type?: string | null
          storage_provider?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string
          drive_file_id?: string
          drive_file_name?: string
          drive_file_type?: string
          drive_file_url?: string
          file_category?: string | null
          file_size?: number | null
          id?: string
          meeting_id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_provider?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_drive_files_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_drive_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_exhibits: {
        Row: {
          created_at: string | null
          exhibit_name: string
          exhibit_type: string
          file_url: string
          id: string
          meeting_id: string
          order_index: number
          page_reference: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          exhibit_name: string
          exhibit_type: string
          file_url: string
          id?: string
          meeting_id: string
          order_index?: number
          page_reference?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          exhibit_name?: string
          exhibit_type?: string
          file_url?: string
          id?: string
          meeting_id?: string
          order_index?: number
          page_reference?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_exhibits_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_insights: {
        Row: {
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_resolved: boolean | null
          meeting_id: string
          related_attendees: string[] | null
          resolved_at: string | null
          severity: string | null
          timestamp: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_resolved?: boolean | null
          meeting_id: string
          related_attendees?: string[] | null
          resolved_at?: string | null
          severity?: string | null
          timestamp?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_resolved?: boolean | null
          meeting_id?: string
          related_attendees?: string[] | null
          resolved_at?: string | null
          severity?: string | null
          timestamp?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_insights_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_integrations: {
        Row: {
          created_at: string | null
          external_id: string
          external_url: string | null
          id: string
          integration_type: string
          last_synced_at: string | null
          meeting_id: string
          sync_config: Json | null
          sync_status: string | null
        }
        Insert: {
          created_at?: string | null
          external_id: string
          external_url?: string | null
          id?: string
          integration_type: string
          last_synced_at?: string | null
          meeting_id: string
          sync_config?: Json | null
          sync_status?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string
          external_url?: string | null
          id?: string
          integration_type?: string
          last_synced_at?: string | null
          meeting_id?: string
          sync_config?: Json | null
          sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_integrations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_media: {
        Row: {
          checksum: string
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          format: string | null
          id: string
          media_type: string
          meeting_id: string
          metadata: Json | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          checksum: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          format?: string | null
          id?: string
          media_type: string
          meeting_id: string
          metadata?: Json | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          checksum?: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          format?: string | null
          id?: string
          media_type?: string
          meeting_id?: string
          metadata?: Json | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_media_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean | null
          meeting_id: string
          note_type: string
          tags: string[] | null
          timestamp_reference: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean | null
          meeting_id: string
          note_type?: string
          tags?: string[] | null
          timestamp_reference?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          meeting_id?: string
          note_type?: string
          tags?: string[] | null
          timestamp_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_polls: {
        Row: {
          allow_multiple: boolean | null
          anonymous: boolean | null
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          meeting_id: string
          options: Json
          poll_type: string
          question: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allow_multiple?: boolean | null
          anonymous?: boolean | null
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          meeting_id: string
          options?: Json
          poll_type?: string
          question: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allow_multiple?: boolean | null
          anonymous?: boolean | null
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          meeting_id?: string
          options?: Json
          poll_type?: string
          question?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_polls_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_resources: {
        Row: {
          created_at: string | null
          description: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_presenting: boolean | null
          meeting_id: string
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_presenting?: boolean | null
          meeting_id: string
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_presenting?: boolean | null
          meeting_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_resources_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_sentiment: {
        Row: {
          analyzed_at: string | null
          compliance_concerns: string[] | null
          confidence: number | null
          id: string
          key_phrases: string[] | null
          meeting_id: string
          risk_indicators: string[] | null
          segment_end: string
          segment_start: string
          sentiment_label: string | null
          sentiment_score: number | null
          topic: string | null
        }
        Insert: {
          analyzed_at?: string | null
          compliance_concerns?: string[] | null
          confidence?: number | null
          id?: string
          key_phrases?: string[] | null
          meeting_id: string
          risk_indicators?: string[] | null
          segment_end: string
          segment_start: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          topic?: string | null
        }
        Update: {
          analyzed_at?: string | null
          compliance_concerns?: string[] | null
          confidence?: number | null
          id?: string
          key_phrases?: string[] | null
          meeting_id?: string
          risk_indicators?: string[] | null
          segment_end?: string
          segment_start?: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sentiment_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_settings: {
        Row: {
          allow_hand_raise: boolean | null
          auto_assignment_enabled: boolean | null
          auto_assignment_mode: string | null
          created_at: string
          default_speaking_time_seconds: number | null
          id: string
          meeting_id: string
          mute_on_join: boolean | null
          recording_mode: string | null
          require_host_approval: boolean | null
          updated_at: string
        }
        Insert: {
          allow_hand_raise?: boolean | null
          auto_assignment_enabled?: boolean | null
          auto_assignment_mode?: string | null
          created_at?: string
          default_speaking_time_seconds?: number | null
          id?: string
          meeting_id: string
          mute_on_join?: boolean | null
          recording_mode?: string | null
          require_host_approval?: boolean | null
          updated_at?: string
        }
        Update: {
          allow_hand_raise?: boolean | null
          auto_assignment_enabled?: boolean | null
          auto_assignment_mode?: string | null
          created_at?: string
          default_speaking_time_seconds?: number | null
          id?: string
          meeting_id?: string
          mute_on_join?: boolean | null
          recording_mode?: string | null
          require_host_approval?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_settings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_sources: {
        Row: {
          content: string | null
          created_at: string | null
          file_url: string | null
          id: string
          meeting_id: string
          metadata: Json | null
          source_type: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          meeting_id: string
          metadata?: Json | null
          source_type: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          meeting_id?: string
          metadata?: Json | null
          source_type?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sources_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_suggestions: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string | null
          open_threads: number | null
          priority_score: number | null
          reasoning: string | null
          status: string | null
          suggested_agenda: Json
          suggested_attendees: string[] | null
          suggested_for: string | null
          suggested_title: string
          unresolved_risks: number | null
          upcoming_milestones: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          open_threads?: number | null
          priority_score?: number | null
          reasoning?: string | null
          status?: string | null
          suggested_agenda: Json
          suggested_attendees?: string[] | null
          suggested_for?: string | null
          suggested_title: string
          unresolved_risks?: number | null
          upcoming_milestones?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          open_threads?: number | null
          priority_score?: number | null
          reasoning?: string | null
          status?: string | null
          suggested_agenda?: Json
          suggested_attendees?: string[] | null
          suggested_for?: string | null
          suggested_title?: string
          unresolved_risks?: number | null
          upcoming_milestones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_suggestions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_summaries: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string | null
          generated_at: string | null
          generated_by: string
          id: string
          meeting_id: string
          model_used: string | null
          summary_type: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          meeting_id: string
          model_used?: string | null
          summary_type: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          meeting_id?: string
          model_used?: string | null
          summary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string
          created_by: string
          default_agenda: Json | null
          default_attendee_roles: Json | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_public: boolean | null
          meeting_settings: Json | null
          name: string
          template_type: string | null
          updated_at: string
          use_count: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          default_agenda?: Json | null
          default_attendee_roles?: Json | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          meeting_settings?: Json | null
          name: string
          template_type?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          default_agenda?: Json | null
          default_attendee_roles?: Json | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          meeting_settings?: Json | null
          name?: string
          template_type?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          briefing_pack_url: string | null
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          location: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"] | null
          minutes_url: string | null
          organizer_notes: string | null
          recording_url: string | null
          requires_offline_support: boolean | null
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          timezone: string | null
          title: string
          transcript_url: string | null
          updated_at: string
          video_conference_url: string | null
          video_provider: Database["public"]["Enums"]["video_provider"] | null
          visibility: string | null
        }
        Insert: {
          briefing_pack_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          minutes_url?: string | null
          organizer_notes?: string | null
          recording_url?: string | null
          requires_offline_support?: boolean | null
          start_time: string
          status?: Database["public"]["Enums"]["meeting_status"]
          timezone?: string | null
          title: string
          transcript_url?: string | null
          updated_at?: string
          video_conference_url?: string | null
          video_provider?: Database["public"]["Enums"]["video_provider"] | null
          visibility?: string | null
        }
        Update: {
          briefing_pack_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          minutes_url?: string | null
          organizer_notes?: string | null
          recording_url?: string | null
          requires_offline_support?: boolean | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          timezone?: string | null
          title?: string
          transcript_url?: string | null
          updated_at?: string
          video_conference_url?: string | null
          video_provider?: Database["public"]["Enums"]["video_provider"] | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel: string
          content: string | null
          created_at: string | null
          delivered_at: string | null
          escalated_at: string | null
          escalation_level: number | null
          id: string
          is_urgent: boolean | null
          meeting_id: string | null
          message_type: string
          metadata: Json | null
          read_at: string | null
          recipient_phone: string
          response_received: boolean | null
          sent_at: string | null
          status: string
          urgency_keywords: string[] | null
          user_id: string | null
        }
        Insert: {
          channel: string
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          is_urgent?: boolean | null
          meeting_id?: string | null
          message_type: string
          metadata?: Json | null
          read_at?: string | null
          recipient_phone: string
          response_received?: boolean | null
          sent_at?: string | null
          status?: string
          urgency_keywords?: string[] | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          is_urgent?: boolean | null
          meeting_id?: string | null
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_phone?: string
          response_received?: boolean | null
          sent_at?: string | null
          status?: string
          urgency_keywords?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      minutes_versions: {
        Row: {
          changes_summary: string | null
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_ratified: boolean | null
          meeting_id: string
          ratified_at: string | null
          ratified_by: string | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_ratified?: boolean | null
          meeting_id: string
          ratified_at?: string | null
          ratified_by?: string | null
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_ratified?: boolean | null
          meeting_id?: string
          ratified_at?: string | null
          ratified_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "minutes_versions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      note_reactions: {
        Row: {
          created_at: string
          id: string
          note_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_reactions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_sources: {
        Row: {
          content: string | null
          created_at: string
          external_url: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          notebook_id: string | null
          source_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          notebook_id?: string | null
          source_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          notebook_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_sources_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          action_id: string | null
          id: string
          meeting_id: string | null
          metadata: Json | null
          notification_type: string
          recipient_email: string
          sent_at: string | null
          subject: string
        }
        Insert: {
          action_id?: string | null
          id?: string
          meeting_id?: string | null
          metadata?: Json | null
          notification_type: string
          recipient_email: string
          sent_at?: string | null
          subject: string
        }
        Update: {
          action_id?: string | null
          id?: string
          meeting_id?: string | null
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          notify_action_assigned: boolean | null
          notify_action_due: boolean | null
          notify_hand_raised: boolean | null
          notify_meeting_reminder_minutes: number | null
          notify_meeting_start: boolean | null
          notify_mention: boolean | null
          notify_mic_granted: boolean | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notify_action_assigned?: boolean | null
          notify_action_due?: boolean | null
          notify_hand_raised?: boolean | null
          notify_meeting_reminder_minutes?: number | null
          notify_meeting_start?: boolean | null
          notify_mention?: boolean | null
          notify_mic_granted?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notify_action_assigned?: boolean | null
          notify_action_due?: boolean | null
          notify_hand_raised?: boolean | null
          notify_meeting_reminder_minutes?: number | null
          notify_meeting_start?: boolean | null
          notify_mention?: boolean | null
          notify_mic_granted?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outcome_simulations: {
        Row: {
          assumptions: Json
          confidence_level: number | null
          created_at: string | null
          created_by: string
          data_sources: Json | null
          decision_id: string | null
          id: string
          impact_score: number | null
          meeting_id: string
          projected_outcomes: Json
          scenario_description: string | null
          scenario_name: string
        }
        Insert: {
          assumptions: Json
          confidence_level?: number | null
          created_at?: string | null
          created_by: string
          data_sources?: Json | null
          decision_id?: string | null
          id?: string
          impact_score?: number | null
          meeting_id: string
          projected_outcomes: Json
          scenario_description?: string | null
          scenario_name: string
        }
        Update: {
          assumptions?: Json
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string
          data_sources?: Json | null
          decision_id?: string | null
          id?: string
          impact_score?: number | null
          meeting_id?: string
          projected_outcomes?: Json
          scenario_description?: string | null
          scenario_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_simulations_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_simulations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_status_log: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          metadata: Json | null
          status_type: string
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          metadata?: Json | null
          status_type: string
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          metadata?: Json | null
          status_type?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_status_log_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_generations: {
        Row: {
          approval_stamp: Json
          brand_kit_id: string | null
          exhibits_included: number | null
          generated_at: string | null
          generated_by: string
          id: string
          meeting_id: string
          minutes_version_id: string
          pdf_url: string
          watermark_applied: string | null
        }
        Insert: {
          approval_stamp: Json
          brand_kit_id?: string | null
          exhibits_included?: number | null
          generated_at?: string | null
          generated_by: string
          id?: string
          meeting_id: string
          minutes_version_id: string
          pdf_url: string
          watermark_applied?: string | null
        }
        Update: {
          approval_stamp?: Json
          brand_kit_id?: string | null
          exhibits_included?: number | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          meeting_id?: string
          minutes_version_id?: string
          pdf_url?: string
          watermark_applied?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_generations_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_generations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_generations_minutes_version_id_fkey"
            columns: ["minutes_version_id"]
            isOneToOne: false
            referencedRelation: "minutes_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string | null
          description: string | null
          id: string
          resource: Database["public"]["Enums"]["permission_resource"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          resource: Database["public"]["Enums"]["permission_resource"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: Database["public"]["Enums"]["permission_resource"]
        }
        Relationships: []
      }
      poll_responses: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          response_text: string | null
          selected_options: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          response_text?: string | null
          selected_options?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          response_text?: string | null
          selected_options?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "meeting_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          meeting_preferences: Json | null
          notification_preferences: Json | null
          recording_preferences: Json | null
          security_preferences: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          meeting_preferences?: Json | null
          notification_preferences?: Json | null
          recording_preferences?: Json | null
          security_preferences?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          meeting_preferences?: Json | null
          notification_preferences?: Json | null
          recording_preferences?: Json | null
          security_preferences?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recording_consents: {
        Row: {
          consent_given: boolean
          consent_timestamp: string
          consent_version: string
          created_at: string
          id: string
          ip_address: string | null
          meeting_id: string
          updated_at: string
          user_id: string
          withdrawal_timestamp: string | null
        }
        Insert: {
          consent_given?: boolean
          consent_timestamp?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meeting_id: string
          updated_at?: string
          user_id: string
          withdrawal_timestamp?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_timestamp?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meeting_id?: string
          updated_at?: string
          user_id?: string
          withdrawal_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recording_consents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          by_day: string[] | null
          by_month_day: number[] | null
          created_at: string
          frequency: string
          id: string
          interval: number | null
          meeting_id: string
          occurrence_count: number | null
          until_date: string | null
        }
        Insert: {
          by_day?: string[] | null
          by_month_day?: number[] | null
          created_at?: string
          frequency: string
          id?: string
          interval?: number | null
          meeting_id: string
          occurrence_count?: number | null
          until_date?: string | null
        }
        Update: {
          by_day?: string[] | null
          by_month_day?: number[] | null
          created_at?: string
          frequency?: string
          id?: string
          interval?: number | null
          meeting_id?: string
          occurrence_count?: number | null
          until_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      redacted_documents: {
        Row: {
          audience_type: string
          created_at: string | null
          created_by: string
          id: string
          meeting_id: string
          original_content: string
          redacted_content: string
          redaction_map: Json
          sensitivity_level: string
        }
        Insert: {
          audience_type: string
          created_at?: string | null
          created_by: string
          id?: string
          meeting_id: string
          original_content: string
          redacted_content: string
          redaction_map: Json
          sensitivity_level: string
        }
        Update: {
          audience_type?: string
          created_at?: string | null
          created_by?: string
          id?: string
          meeting_id?: string
          original_content?: string
          redacted_content?: string
          redaction_map?: Json
          sensitivity_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "redacted_documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      section_sensitivities: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          meeting_id: string
          redacted_for_distribution: boolean | null
          requires_countersignature: boolean | null
          section_content: string
          section_type: string
          sensitivity_level: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          meeting_id: string
          redacted_for_distribution?: boolean | null
          requires_countersignature?: boolean | null
          section_content: string
          section_type: string
          sensitivity_level?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          meeting_id?: string
          redacted_for_distribution?: boolean | null
          requires_countersignature?: boolean | null
          section_content?: string
          section_type?: string
          sensitivity_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_sensitivities_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          assigned_to: string
          created_at: string | null
          id: string
          meeting_id: string
          minutes_version_id: string
          package_data: Json
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string
          signed_at: string | null
          status: string
        }
        Insert: {
          assigned_to: string
          created_at?: string | null
          id?: string
          meeting_id: string
          minutes_version_id: string
          package_data: Json
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by: string
          signed_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string | null
          id?: string
          meeting_id?: string
          minutes_version_id?: string
          package_data?: Json
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_minutes_version_id_fkey"
            columns: ["minutes_version_id"]
            isOneToOne: false
            referencedRelation: "minutes_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string | null
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean | null
          password: string
          port: number
          updated_at: string | null
          use_tls: boolean | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_active?: boolean | null
          password: string
          port?: number
          updated_at?: string | null
          use_tls?: boolean | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean | null
          password?: string
          port?: number
          updated_at?: string | null
          use_tls?: boolean | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      speaker_analytics: {
        Row: {
          created_at: string | null
          engagement_score: number | null
          id: string
          interruptions_count: number | null
          last_updated: string | null
          meeting_id: string
          questions_asked: number | null
          sentiment_score: number | null
          speaking_time_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          interruptions_count?: number | null
          last_updated?: string | null
          meeting_id: string
          questions_asked?: number | null
          sentiment_score?: number | null
          speaking_time_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          interruptions_count?: number | null
          last_updated?: string | null
          meeting_id?: string
          questions_asked?: number | null
          sentiment_score?: number | null
          speaking_time_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_analytics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_emotional_profiles: {
        Row: {
          average_energy: number | null
          average_sentiment: number | null
          created_at: string | null
          dominant_emotion: string | null
          emotion_distribution: Json | null
          emotional_stability: number | null
          id: string
          last_analyzed_meeting_id: string | null
          meeting_count: number | null
          sentiment_trend: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_energy?: number | null
          average_sentiment?: number | null
          created_at?: string | null
          dominant_emotion?: string | null
          emotion_distribution?: Json | null
          emotional_stability?: number | null
          id?: string
          last_analyzed_meeting_id?: string | null
          meeting_count?: number | null
          sentiment_trend?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_energy?: number | null
          average_sentiment?: number | null
          created_at?: string | null
          dominant_emotion?: string | null
          emotion_distribution?: Json | null
          emotional_stability?: number | null
          id?: string
          last_analyzed_meeting_id?: string | null
          meeting_count?: number | null
          sentiment_trend?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      speaker_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          meeting_id: string
          queue_position: number
          requested_at: string
          started_at: string | null
          status: string
          time_limit_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          queue_position: number
          requested_at?: string
          started_at?: string | null
          status?: string
          time_limit_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          queue_position?: number
          requested_at?: string
          started_at?: string | null
          status?: string
          time_limit_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_queue_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_outputs: {
        Row: {
          content: Json
          created_at: string | null
          file_url: string | null
          generated_by: string | null
          id: string
          meeting_id: string
          output_type: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          meeting_id: string
          output_type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          meeting_id?: string
          output_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_outputs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_outputs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      transcript_versions: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string
          id: string
          meeting_id: string
          notes: string | null
          version_number: number
        }
        Insert: {
          content: Json
          created_at?: string | null
          created_by: string
          id?: string
          meeting_id: string
          notes?: string | null
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          meeting_id?: string
          notes?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcript_versions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_embeddings: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          meeting_id: string
          speaker_name: string | null
          timestamp: string | null
          transcription_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          meeting_id: string
          speaker_name?: string | null
          timestamp?: string | null
          transcription_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          meeting_id?: string
          speaker_name?: string | null
          timestamp?: string | null
          transcription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_embeddings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_embeddings_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_preferences: {
        Row: {
          created_at: string
          elevenlabs_api_key: string | null
          id: string
          language: string | null
          openai_api_key: string | null
          provider: string
          realtime_api_key: string | null
          updated_at: string
          use_same_key: boolean | null
          user_id: string
          whisper_api_key: string | null
        }
        Insert: {
          created_at?: string
          elevenlabs_api_key?: string | null
          id?: string
          language?: string | null
          openai_api_key?: string | null
          provider?: string
          realtime_api_key?: string | null
          updated_at?: string
          use_same_key?: boolean | null
          user_id: string
          whisper_api_key?: string | null
        }
        Update: {
          created_at?: string
          elevenlabs_api_key?: string | null
          id?: string
          language?: string | null
          openai_api_key?: string | null
          provider?: string
          realtime_api_key?: string | null
          updated_at?: string
          use_same_key?: boolean | null
          user_id?: string
          whisper_api_key?: string | null
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string
          detected_language: string | null
          id: string
          meeting_id: string
          speaker_id: string | null
          speaker_name: string | null
          timestamp: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string
          detected_language?: string | null
          id?: string
          meeting_id: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string
          detected_language?: string | null
          id?: string
          meeting_id?: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      urgent_keywords: {
        Row: {
          auto_escalate: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keyword: string
          priority_level: number | null
        }
        Insert: {
          auto_escalate?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          priority_level?: number | null
        }
        Update: {
          auto_escalate?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          priority_level?: number | null
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_guba_learning_metrics: { Args: never; Returns: undefined }
      can_access_element: {
        Args: { _element_type: string; _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      can_start_task: { Args: { p_task_id: string }; Returns: boolean }
      get_users_with_role_name: {
        Args: { _role_name: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _resource: Database["public"]["Enums"]["permission_resource"]
          _user_id: string
        }
        Returns: boolean
      }
      has_time_based_access: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_attendee: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_guest: { Args: { _user_id: string }; Returns: boolean }
      is_senior_role: { Args: { _user_id: string }; Returns: boolean }
      match_transcriptions: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          meeting_id: string
          similarity: number
          speaker_name: string
          transcription_id: string
          ts: string
        }[]
      }
      seed_sample_data: { Args: never; Returns: undefined }
      should_send_notification: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      action_priority: "low" | "medium" | "high"
      action_status: "pending" | "in_progress" | "completed" | "overdue"
      agenda_item_status: "pending" | "in_progress" | "completed"
      meeting_status:
        | "draft"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      meeting_type:
        | "online"
        | "in_person"
        | "hybrid"
        | "video_conference"
        | "virtual_room"
        | "standard"
      permission_action: "create" | "read" | "update" | "delete" | "manage"
      permission_resource:
        | "users"
        | "roles"
        | "meetings"
        | "actions"
        | "transcriptions"
        | "settings"
      video_provider:
        | "google_meet"
        | "jitsi_meet"
        | "zoom"
        | "teams"
        | "other"
        | "tmeet"
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
      action_priority: ["low", "medium", "high"],
      action_status: ["pending", "in_progress", "completed", "overdue"],
      agenda_item_status: ["pending", "in_progress", "completed"],
      meeting_status: [
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      meeting_type: [
        "online",
        "in_person",
        "hybrid",
        "video_conference",
        "virtual_room",
        "standard",
      ],
      permission_action: ["create", "read", "update", "delete", "manage"],
      permission_resource: [
        "users",
        "roles",
        "meetings",
        "actions",
        "transcriptions",
        "settings",
      ],
      video_provider: [
        "google_meet",
        "jitsi_meet",
        "zoom",
        "teams",
        "other",
        "tmeet",
      ],
    },
  },
} as const
