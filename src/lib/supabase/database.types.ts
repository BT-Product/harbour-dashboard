// Hand-written to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript` once the project is linked to a live
// Supabase instance, and diff against this file before replacing it.
//
// NOTE: these must be `type` aliases, not `interface`s. postgrest-js checks
// Row/Insert/Update against `Record<string, unknown>`, and TypeScript only
// treats plain object *type aliases* as structurally compatible with an
// index signature — interfaces are not, and every table silently resolves
// to `never` if you use one. Verified empirically against @supabase/postgrest-js.

export type TransactionType = "buy" | "sell";
export type TransactionStatus = "active" | "closed" | "fell_through";
export type InterestLevel = "pass" | "maybe" | "strong";
export type ItemImportance = "dealbreaker" | "important" | "minor";

export type KeyDates = {
  contract_date?: string;
  contingency_removal_date?: string;
  coe_date?: string;
  [key: string]: string | undefined;
};

export type Agent = {
  id: string;
  name: string;
  email: string;
  brokerage: string | null;
  dre_number: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  agent_id: string;
  full_name: string;
  phone: string | null;
  is_agent: boolean;
  partner_name: string | null;
  partner_email: string | null;
  created_at: string;
};

export type StageDefinition = {
  stage_key: string;
  transaction_type: TransactionType;
  sort_order: number;
  label: string;
  explainer: string;
};

export type Transaction = {
  id: string;
  client_id: string;
  agent_id: string;
  type: TransactionType;
  status: TransactionStatus;
  current_stage_key: string;
  property_address: string;
  key_dates: KeyDates;
  linked_transaction_id: string | null;
  created_at: string;
};

// Client-safe projection only — private_notes is intentionally absent.
// The database enforces this too (column grant revoked for `authenticated`),
// this type just keeps the app code honest about which shape it's using.
export type HomeSeenClientSafe = {
  id: string;
  client_id: string;
  address: string;
  client_notes: string | null;
  interest_level: InterestLevel | null;
  seen_at: string;
  debriefed_at: string | null;
  created_at: string;
};

// Full row, only obtainable via the agent_* RPC functions.
export type HomeSeen = HomeSeenClientSafe & {
  private_notes: string | null;
};

export type Tour = {
  id: string;
  client_id: string;
  home_seen_id: string | null;
  address: string;
  scheduled_at: string;
  notes: string | null;
  created_at: string;
};

export type InspectionItem = {
  id: string;
  transaction_id: string;
  item: string;
  importance_to_client: ItemImportance;
  negotiation_note: string | null;
  resolved: boolean;
  created_at: string;
};

export type Preapproval = {
  id: string;
  client_id: string;
  loan_amount: number;
  down_payment: number;
  rate: number;
  lender: string | null;
  hoa_monthly: number;
  updated_at: string;
};

export type ClientPageView = {
  id: number;
  client_id: string;
  path: string;
  viewed_at: string;
};

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: Agent;
        Insert: Partial<Agent>;
        Update: Partial<Agent>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      stage_definitions: {
        Row: StageDefinition;
        Insert: Partial<StageDefinition>;
        Update: Partial<StageDefinition>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Partial<Transaction>;
        Update: Partial<Transaction>;
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      // Insert/Update are structurally empty: direct writes are blocked at
      // the database (RLS + revoked grants) — all writes go through
      // agent_upsert_home_debrief. Keeping these as `{}` rather than `never`
      // means the table still satisfies postgrest-js's GenericTable shape.
      homes_seen: {
        Row: HomeSeenClientSafe;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      tours: {
        Row: Tour;
        Insert: Partial<Tour>;
        Update: Partial<Tour>;
        Relationships: [];
      };
      inspection_items: {
        Row: InspectionItem;
        Insert: Partial<InspectionItem>;
        Update: Partial<InspectionItem>;
        Relationships: [];
      };
      preapproval: {
        Row: Preapproval;
        Insert: Partial<Preapproval>;
        Update: Partial<Preapproval>;
        Relationships: [];
      };
      // Insert is structurally empty: rows only ever arrive through
      // record_my_page_view, which scopes them to auth.uid().
      client_page_views: {
        Row: ClientPageView;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      // Infra-only, service-role access. See /api/health and migration 0003.
      _health_check: {
        Row: { id: boolean; checked_at: string };
        Insert: { id?: boolean; checked_at?: string };
        Update: { id?: boolean; checked_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      agent_upsert_home_debrief: {
        Args: {
          p_home_id: string | null;
          p_client_id: string;
          p_address: string;
          p_client_notes: string | null;
          p_private_notes: string | null;
          p_interest_level: InterestLevel | null;
          p_seen_at: string;
        };
        Returns: HomeSeen;
      };
      agent_list_homes_seen: {
        Args: { p_client_id: string };
        Returns: HomeSeen[];
      };
      agent_advance_stage: {
        Args: { p_transaction_id: string; p_stage_key: string };
        Returns: Transaction;
      };
      update_my_partner: {
        Args: { p_partner_name: string | null; p_partner_email: string | null };
        Returns: Profile;
      };
      agent_update_key_dates: {
        Args: { p_transaction_id: string; p_key_dates: KeyDates };
        Returns: Transaction;
      };
      agent_upsert_tour: {
        Args: {
          p_tour_id: string | null;
          p_client_id: string;
          p_address: string;
          p_scheduled_at: string;
          p_notes: string | null;
        };
        Returns: Tour;
      };
      agent_delete_tour: {
        Args: { p_tour_id: string };
        Returns: undefined;
      };
      agent_upsert_inspection_item: {
        Args: {
          p_item_id: string | null;
          p_transaction_id: string;
          p_item: string;
          p_importance: ItemImportance;
          p_negotiation_note: string | null;
          p_resolved: boolean;
        };
        Returns: InspectionItem;
      };
      agent_delete_inspection_item: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      record_my_page_view: {
        Args: { p_path: string };
        Returns: undefined;
      };
      agent_upsert_preapproval: {
        Args: {
          p_client_id: string;
          p_loan_amount: number;
          p_down_payment: number;
          p_rate: number;
          p_lender: string | null;
          p_hoa_monthly: number;
        };
        Returns: Preapproval;
      };
      agent_delete_preapproval: {
        Args: { p_client_id: string };
        Returns: undefined;
      };
      agent_delete_client_data: {
        Args: { p_client_id: string };
        Returns: undefined;
      };
      agent_create_transaction: {
        Args: {
          p_client_id: string;
          p_type: TransactionType;
          p_property_address: string;
          p_stage_key: string | null;
          p_link_to_transaction_id: string | null;
        };
        Returns: Transaction;
      };
    };
  };
};
