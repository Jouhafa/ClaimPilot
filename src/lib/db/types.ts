// Database type definitions matching Supabase schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          email_verified: string | null;
          name: string | null;
          image: string | null;
          password_hash: string | null;
          provider: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          posting_date: string | null;
          merchant: string;
          description: string;
          amount: number;
          currency: string;
          balance: number | null;
          account_id: string | null;
          tag: string | null;
          status: string | null;
          transaction_status: string | null;
          is_manual: boolean;
          note: string | null;
          batch_id: string | null;
          category: string | null;
          spending_type: string | null;
          kind: string | null;
          source_doc_type: string | null;
          source_file_name: string | null;
          is_recurring: boolean;
          recurring_frequency: string | null;
          parent_id: string | null;
          split_percentage: number | null;
          is_split: boolean;
          suggested_tag: string | null;
          suggested_category: string | null;
          tag_confidence: string | null;
          tag_reason: string | null;
          is_auto_tagged: boolean;
          is_auto_categorized: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      // Add other tables as needed
    };
  };
}

