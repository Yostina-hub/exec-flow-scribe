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
          assigned_to: string
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          created_by: string
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
          status: Database["public"]["Enums"]["action_status"]
          status_detail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
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
          status?: Database["public"]["Enums"]["action_status"]
          status_detail?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
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
          status?: Database["public"]["Enums"]["action_status"]
          status_detail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          attendance_confirmed?: boolean | null
          attended?: boolean | null
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          attendance_confirmed?: boolean | null
          attended?: boolean | null
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
      meetings: {
        Row: {
          briefing_pack_url: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          location: string | null
          minutes_url: string | null
          recording_url: string | null
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          transcript_url: string | null
          updated_at: string
        }
        Insert: {
          briefing_pack_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          minutes_url?: string | null
          recording_url?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          transcript_url?: string | null
          updated_at?: string
        }
        Update: {
          briefing_pack_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          minutes_url?: string | null
          recording_url?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          transcript_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
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
      transcription_preferences: {
        Row: {
          created_at: string
          id: string
          openai_api_key: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          openai_api_key?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          openai_api_key?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string
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
      get_users_with_role_name: {
        Args: { _role_name: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_any_role: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _resource: Database["public"]["Enums"]["permission_resource"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_sample_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      permission_action: "create" | "read" | "update" | "delete" | "manage"
      permission_resource:
        | "users"
        | "roles"
        | "meetings"
        | "actions"
        | "transcriptions"
        | "settings"
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
      permission_action: ["create", "read", "update", "delete", "manage"],
      permission_resource: [
        "users",
        "roles",
        "meetings",
        "actions",
        "transcriptions",
        "settings",
      ],
    },
  },
} as const
