export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      amenities: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          display_order: number | null;
          icon: string | null;
          id: string;
          name: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "amenities_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "amenity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      amenity_categories: {
        Row: {
          created_at: string | null;
          display_order: number | null;
          icon: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      blog_images: {
        Row: {
          alt_text: string | null;
          blog_id: string | null;
          caption: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          storage_path: string;
        };
        Insert: {
          alt_text?: string | null;
          blog_id?: string | null;
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          storage_path: string;
        };
        Update: {
          alt_text?: string | null;
          blog_id?: string | null;
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blog_images_blog_id_fkey";
            columns: ["blog_id"];
            isOneToOne: false;
            referencedRelation: "blogs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blog_images_blog_id_fkey";
            columns: ["blog_id"];
            isOneToOne: false;
            referencedRelation: "blogs_with_author";
            referencedColumns: ["id"];
          },
        ];
      };
      blogs: {
        Row: {
          author_id: string;
          content: string;
          created_at: string | null;
          excerpt: string | null;
          featured_image: string | null;
          id: string;
          meta_description: string | null;
          meta_title: string | null;
          published_at: string | null;
          slug: string;
          status: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string | null;
          view_count: number | null;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string | null;
          excerpt?: string | null;
          featured_image?: string | null;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          published_at?: string | null;
          slug: string;
          status?: string | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string | null;
          excerpt?: string | null;
          featured_image?: string | null;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          published_at?: string | null;
          slug?: string;
          status?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Relationships: [];
      };
      boat_amenities: {
        Row: {
          additional_charge: number | null;
          amenity_id: string;
          boat_id: string;
          id: string;
          is_free: boolean | null;
        };
        Insert: {
          additional_charge?: number | null;
          amenity_id: string;
          boat_id: string;
          id?: string;
          is_free?: boolean | null;
        };
        Update: {
          additional_charge?: number | null;
          amenity_id?: string;
          boat_id?: string;
          id?: string;
          is_free?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "boat_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boat_amenities_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
        ];
      };
      boat_bookings: {
        Row: {
          boat_id: string;
          booking_reference: string;
          booking_source: string | null;
          booking_status: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          child_price_per_person: number | null;
          created_at: string | null;
          currency: string;
          discount_amount: number;
          guest_email: string;
          guest_first_name: string;
          guest_last_name: string;
          guest_phone: string;
          id: string;
          num_adults: number;
          num_children: number;
          payment_method: string | null;
          payment_status: string;
          payment_transaction_id: string | null;
          price_per_boat: number | null;
          price_per_person: number | null;
          pricing_model: string;
          service_fee: number;
          special_requests: string | null;
          subtotal: number;
          tax_amount: number;
          tax_percentage: number | null;
          time_slot_id: string;
          total_amount: number;
          trip_date: string;
          trip_type_id: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          boat_id: string;
          booking_reference: string;
          booking_source?: string | null;
          booking_status?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          child_price_per_person?: number | null;
          created_at?: string | null;
          currency?: string;
          discount_amount?: number;
          guest_email: string;
          guest_first_name: string;
          guest_last_name: string;
          guest_phone: string;
          id?: string;
          num_adults?: number;
          num_children?: number;
          payment_method?: string | null;
          payment_status?: string;
          payment_transaction_id?: string | null;
          price_per_boat?: number | null;
          price_per_person?: number | null;
          pricing_model: string;
          service_fee?: number;
          special_requests?: string | null;
          subtotal: number;
          tax_amount?: number;
          tax_percentage?: number | null;
          time_slot_id: string;
          total_amount: number;
          trip_date: string;
          trip_type_id: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          boat_id?: string;
          booking_reference?: string;
          booking_source?: string | null;
          booking_status?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          child_price_per_person?: number | null;
          created_at?: string | null;
          currency?: string;
          discount_amount?: number;
          guest_email?: string;
          guest_first_name?: string;
          guest_last_name?: string;
          guest_phone?: string;
          id?: string;
          num_adults?: number;
          num_children?: number;
          payment_method?: string | null;
          payment_status?: string;
          payment_transaction_id?: string | null;
          price_per_boat?: number | null;
          price_per_person?: number | null;
          pricing_model?: string;
          service_fee?: number;
          special_requests?: string | null;
          subtotal?: number;
          tax_amount?: number;
          tax_percentage?: number | null;
          time_slot_id?: string;
          total_amount?: number;
          trip_date?: string;
          trip_type_id?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boat_bookings_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boat_bookings_time_slot_id_fkey";
            columns: ["time_slot_id"];
            isOneToOne: false;
            referencedRelation: "trip_time_slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boat_bookings_trip_type_id_fkey";
            columns: ["trip_type_id"];
            isOneToOne: false;
            referencedRelation: "trip_types";
            referencedColumns: ["id"];
          },
        ];
      };
      boat_images: {
        Row: {
          alt_text: string | null;
          boat_id: string;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          is_primary: boolean | null;
          storage_path: string | null;
        };
        Insert: {
          alt_text?: string | null;
          boat_id: string;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          is_primary?: boolean | null;
          storage_path?: string | null;
        };
        Update: {
          alt_text?: string | null;
          boat_id?: string;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          is_primary?: boolean | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boat_images_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
        ];
      };
      boat_reviews: {
        Row: {
          boat_booking_id: string;
          boat_id: string;
          comment: string | null;
          created_at: string | null;
          crew_rating: number | null;
          experience_rating: number | null;
          id: string;
          image_urls: string[] | null;
          is_verified: boolean | null;
          overall_rating: number;
          safety_rating: number | null;
          status: string;
          title: string | null;
          trip_date: string | null;
          updated_at: string | null;
          user_id: string;
          value_rating: number | null;
        };
        Insert: {
          boat_booking_id: string;
          boat_id: string;
          comment?: string | null;
          created_at?: string | null;
          crew_rating?: number | null;
          experience_rating?: number | null;
          id?: string;
          image_urls?: string[] | null;
          is_verified?: boolean | null;
          overall_rating: number;
          safety_rating?: number | null;
          status?: string;
          title?: string | null;
          trip_date?: string | null;
          updated_at?: string | null;
          user_id: string;
          value_rating?: number | null;
        };
        Update: {
          boat_booking_id?: string;
          boat_id?: string;
          comment?: string | null;
          created_at?: string | null;
          crew_rating?: number | null;
          experience_rating?: number | null;
          id?: string;
          image_urls?: string[] | null;
          is_verified?: boolean | null;
          overall_rating?: number;
          safety_rating?: number | null;
          status?: string;
          title?: string | null;
          trip_date?: string | null;
          updated_at?: string | null;
          user_id?: string;
          value_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "boat_reviews_boat_booking_id_fkey";
            columns: ["boat_booking_id"];
            isOneToOne: false;
            referencedRelation: "boat_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boat_reviews_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
        ];
      };
      boats: {
        Row: {
          address_line_1: string | null;
          boat_type: string;
          cancellation_policy_text: string | null;
          capacity: number;
          city: string;
          country: string;
          created_at: string | null;
          departure_point: string | null;
          description: string | null;
          email: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          owner_id: string | null;
          phone: string | null;
          safety_info_text: string | null;
          slug: string;
          state: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          address_line_1?: string | null;
          boat_type?: string;
          cancellation_policy_text?: string | null;
          capacity?: number;
          city?: string;
          country?: string;
          created_at?: string | null;
          departure_point?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          owner_id?: string | null;
          phone?: string | null;
          safety_info_text?: string | null;
          slug: string;
          state?: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          address_line_1?: string | null;
          boat_type?: string;
          cancellation_policy_text?: string | null;
          capacity?: number;
          city?: string;
          country?: string;
          created_at?: string | null;
          departure_point?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          owner_id?: string | null;
          phone?: string | null;
          safety_info_text?: string | null;
          slug?: string;
          state?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      booking_meal_plans: {
        Row: {
          booking_id: string;
          created_at: string | null;
          id: string;
          meal_plan_id: string;
          meal_type: string;
          name: string;
          num_guests: number;
          num_nights: number;
          price_per_person: number;
          total_amount: number;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          id?: string;
          meal_plan_id: string;
          meal_type: string;
          name: string;
          num_guests: number;
          num_nights: number;
          price_per_person: number;
          total_amount: number;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          meal_plan_id?: string;
          meal_type?: string;
          name?: string;
          num_guests?: number;
          num_nights?: number;
          price_per_person?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_meal_plans_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_meal_plans_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booking_reference: string;
          booking_status: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          check_in_date: string;
          check_out_date: string;
          created_at: string | null;
          guest_email: string;
          guest_first_name: string;
          guest_last_name: string;
          guest_phone: string;
          hotel_id: string;
          id: string;
          meal_plan_total: number | null;
          num_adults: number;
          num_children: number | null;
          num_nights: number | null;
          num_rooms: number | null;
          payment_method: string | null;
          payment_status: string | null;
          payment_transaction_id: string | null;
          price_per_night: number;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          room_type_id: string;
          service_fee: number | null;
          special_requests: string | null;
          subtotal: number | null;
          tax_amount: number | null;
          total_amount: number;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          booking_reference: string;
          booking_status?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          check_in_date: string;
          check_out_date: string;
          created_at?: string | null;
          guest_email: string;
          guest_first_name: string;
          guest_last_name: string;
          guest_phone: string;
          hotel_id: string;
          id?: string;
          meal_plan_total?: number | null;
          num_adults: number;
          num_children?: number | null;
          num_nights?: number | null;
          num_rooms?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          payment_transaction_id?: string | null;
          price_per_night: number;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          room_type_id: string;
          service_fee?: number | null;
          special_requests?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount: number;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          booking_reference?: string;
          booking_status?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          check_in_date?: string;
          check_out_date?: string;
          created_at?: string | null;
          guest_email?: string;
          guest_first_name?: string;
          guest_last_name?: string;
          guest_phone?: string;
          hotel_id?: string;
          id?: string;
          meal_plan_total?: number | null;
          num_adults?: number;
          num_children?: number | null;
          num_nights?: number | null;
          num_rooms?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          payment_transaction_id?: string | null;
          price_per_night?: number;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          room_type_id?: string;
          service_fee?: number | null;
          special_requests?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount?: number;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      cancellation_policies: {
        Row: {
          cancellation_charge_percentage: number | null;
          created_at: string | null;
          free_cancellation_hours: number | null;
          hotel_id: string;
          id: string;
          is_active: boolean | null;
          no_show_charge_percentage: number | null;
          policy_name: string;
          room_type_id: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          cancellation_charge_percentage?: number | null;
          created_at?: string | null;
          free_cancellation_hours?: number | null;
          hotel_id: string;
          id?: string;
          is_active?: boolean | null;
          no_show_charge_percentage?: number | null;
          policy_name: string;
          room_type_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          cancellation_charge_percentage?: number | null;
          created_at?: string | null;
          free_cancellation_hours?: number | null;
          hotel_id?: string;
          id?: string;
          is_active?: boolean | null;
          no_show_charge_percentage?: number | null;
          policy_name?: string;
          room_type_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cancellation_policies_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cancellation_policies_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      child_policies: {
        Row: {
          age_charged_as_adult: number | null;
          children_allowed: boolean | null;
          created_at: string | null;
          crib_available: boolean | null;
          crib_charge: number | null;
          extra_bed_available: boolean | null;
          extra_bed_charge: number | null;
          hotel_id: string;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          age_charged_as_adult?: number | null;
          children_allowed?: boolean | null;
          created_at?: string | null;
          crib_available?: boolean | null;
          crib_charge?: number | null;
          extra_bed_available?: boolean | null;
          extra_bed_charge?: number | null;
          hotel_id: string;
          id?: string;
          updated_at?: string | null;
        };
        Update: {
          age_charged_as_adult?: number | null;
          children_allowed?: boolean | null;
          created_at?: string | null;
          crib_available?: boolean | null;
          crib_charge?: number | null;
          extra_bed_available?: boolean | null;
          extra_bed_charge?: number | null;
          hotel_id?: string;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "child_policies_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "child_policies_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: string;
          category: string | null;
          created_at: string | null;
          display_order: number | null;
          hotel_id: string | null;
          id: string;
          is_active: boolean | null;
          question: string;
          updated_at: string | null;
        };
        Insert: {
          answer: string;
          category?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          question: string;
          updated_at?: string | null;
        };
        Update: {
          answer?: string;
          category?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          question?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "faqs_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_admin_permissions: {
        Row: {
          enabled: boolean;
          permission_key: string;
          requires_approval: boolean;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          permission_key: string;
          requires_approval?: boolean;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          permission_key?: string;
          requires_approval?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      hotel_amenities: {
        Row: {
          additional_charge: number | null;
          amenity_id: string;
          created_at: string | null;
          hotel_id: string;
          id: string;
          is_free: boolean | null;
        };
        Insert: {
          additional_charge?: number | null;
          amenity_id: string;
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          is_free?: boolean | null;
        };
        Update: {
          additional_charge?: number | null;
          amenity_id?: string;
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          is_free?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_amenities_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_amenities_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_images: {
        Row: {
          alt_text: string | null;
          created_at: string | null;
          display_order: number | null;
          hotel_id: string;
          id: string;
          image_url: string;
          is_primary: boolean | null;
          storage_path: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id: string;
          id?: string;
          image_url: string;
          is_primary?: boolean | null;
          storage_path?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id?: string;
          id?: string;
          image_url?: string;
          is_primary?: boolean | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_images_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_images_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_languages: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          language_id: string;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          language_id: string;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          language_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_languages_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_languages_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_languages_language_id_fkey";
            columns: ["language_id"];
            isOneToOne: false;
            referencedRelation: "languages";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_nearby_attractions: {
        Row: {
          attraction_id: string;
          created_at: string | null;
          distance_meters: number | null;
          distance_text: string | null;
          hotel_id: string;
          id: string;
        };
        Insert: {
          attraction_id: string;
          created_at?: string | null;
          distance_meters?: number | null;
          distance_text?: string | null;
          hotel_id: string;
          id?: string;
        };
        Update: {
          attraction_id?: string;
          created_at?: string | null;
          distance_meters?: number | null;
          distance_text?: string | null;
          hotel_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_nearby_attractions_attraction_id_fkey";
            columns: ["attraction_id"];
            isOneToOne: false;
            referencedRelation: "nearby_attractions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_nearby_attractions_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_nearby_attractions_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_payment_methods: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          is_accepted: boolean | null;
          payment_method_id: string;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          is_accepted?: boolean | null;
          payment_method_id: string;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          is_accepted?: boolean | null;
          payment_method_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_payment_methods_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_payment_methods_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_payment_methods_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_property_highlights: {
        Row: {
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          highlight_type: string | null;
          hotel_id: string;
          icon: string | null;
          id: string;
          title: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          highlight_type?: string | null;
          hotel_id: string;
          icon?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          highlight_type?: string | null;
          hotel_id?: string;
          icon?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_property_highlights_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotel_property_highlights_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotels: {
        Row: {
          address_line_1: string;
          address_line_2: string | null;
          advance_notice_required: boolean | null;
          cancellation_policy_text: string | null;
          chain_brand: string | null;
          check_in_from_time: string | null;
          check_in_to_time: string | null;
          check_out_time: string | null;
          child_policy_text: string | null;
          city: string;
          country: string;
          created_at: string | null;
          description: string | null;
          email: string | null;
          extra_bed_policy_text: string | null;
          id: string;
          inventory_source: string;
          is_genius_discount_available: boolean | null;
          latitude: number | null;
          location_rating: number | null;
          longitude: number | null;
          maps_embed_url: string | null;
          minimum_age_check_in: number | null;
          name: string;
          owner_id: string | null;
          parking_available: boolean | null;
          parking_free: boolean | null;
          parking_type: string | null;
          pet_policy_text: string | null;
          phone: string | null;
          postal_code: string | null;
          property_type: string | null;
          slug: string;
          smoking_allowed: boolean | null;
          star_rating: number | null;
          state: string;
          status: string | null;
          updated_at: string | null;
          website: string | null;
        };
        Insert: {
          address_line_1: string;
          address_line_2?: string | null;
          advance_notice_required?: boolean | null;
          cancellation_policy_text?: string | null;
          chain_brand?: string | null;
          check_in_from_time?: string | null;
          check_in_to_time?: string | null;
          check_out_time?: string | null;
          child_policy_text?: string | null;
          city: string;
          country: string;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          extra_bed_policy_text?: string | null;
          id?: string;
          inventory_source?: string;
          is_genius_discount_available?: boolean | null;
          latitude?: number | null;
          location_rating?: number | null;
          longitude?: number | null;
          maps_embed_url?: string | null;
          minimum_age_check_in?: number | null;
          name: string;
          owner_id?: string | null;
          parking_available?: boolean | null;
          parking_free?: boolean | null;
          parking_type?: string | null;
          pet_policy_text?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          property_type?: string | null;
          slug: string;
          smoking_allowed?: boolean | null;
          star_rating?: number | null;
          state: string;
          status?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Update: {
          address_line_1?: string;
          address_line_2?: string | null;
          advance_notice_required?: boolean | null;
          cancellation_policy_text?: string | null;
          chain_brand?: string | null;
          check_in_from_time?: string | null;
          check_in_to_time?: string | null;
          check_out_time?: string | null;
          child_policy_text?: string | null;
          city?: string;
          country?: string;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          extra_bed_policy_text?: string | null;
          id?: string;
          inventory_source?: string;
          is_genius_discount_available?: boolean | null;
          latitude?: number | null;
          location_rating?: number | null;
          longitude?: number | null;
          maps_embed_url?: string | null;
          minimum_age_check_in?: number | null;
          name?: string;
          owner_id?: string | null;
          parking_available?: boolean | null;
          parking_free?: boolean | null;
          parking_type?: string | null;
          pet_policy_text?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          property_type?: string | null;
          slug?: string;
          smoking_allowed?: boolean | null;
          star_rating?: number | null;
          state?: string;
          status?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      languages: {
        Row: {
          code: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          child_price_per_person: number | null;
          created_at: string | null;
          description: string | null;
          hotel_id: string;
          id: string;
          meal_type: string;
          name: string;
          price_per_person: number;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          child_price_per_person?: number | null;
          created_at?: string | null;
          description?: string | null;
          hotel_id: string;
          id?: string;
          meal_type: string;
          name: string;
          price_per_person?: number;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          child_price_per_person?: number | null;
          created_at?: string | null;
          description?: string | null;
          hotel_id?: string;
          id?: string;
          meal_type?: string;
          name?: string;
          price_per_person?: number;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plans_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      nearby_attractions: {
        Row: {
          category: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_anomalies: {
        Row: {
          anomaly_type: string | null;
          booking_id: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
          payment_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string | null;
          status: string | null;
        };
        Insert: {
          anomaly_type?: string | null;
          booking_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          payment_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          status?: string | null;
        };
        Update: {
          anomaly_type?: string | null;
          booking_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          payment_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_anomalies_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_audit_log: {
        Row: {
          booking_id: string | null;
          created_at: string | null;
          error_message: string | null;
          event_source: string | null;
          event_type: string;
          id: string;
          ip_address: unknown;
          payload: Json | null;
          payment_id: string | null;
          success: boolean | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          event_source?: string | null;
          event_type: string;
          id?: string;
          ip_address?: unknown;
          payload?: Json | null;
          payment_id?: string | null;
          success?: boolean | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          event_source?: string | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown;
          payload?: Json | null;
          payment_id?: string | null;
          success?: boolean | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          code: string;
          created_at: string | null;
          icon_url: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          created_at: string | null;
          currency: string | null;
          id: string;
          paid_at: string | null;
          payment_details: Json | null;
          payment_gateway: string | null;
          payment_gateway_order_id: string | null;
          payment_gateway_payment_id: string | null;
          payment_method: string | null;
          payment_method_id: string | null;
          payment_reference: string | null;
          refund_amount: number | null;
          refund_id: string | null;
          refunded_at: string | null;
          status: string | null;
          transaction_id: string | null;
        };
        Insert: {
          amount: number;
          booking_id: string;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_details?: Json | null;
          payment_gateway?: string | null;
          payment_gateway_order_id?: string | null;
          payment_gateway_payment_id?: string | null;
          payment_method?: string | null;
          payment_method_id?: string | null;
          payment_reference?: string | null;
          refund_amount?: number | null;
          refund_id?: string | null;
          refunded_at?: string | null;
          status?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_details?: Json | null;
          payment_gateway?: string | null;
          payment_gateway_order_id?: string | null;
          payment_gateway_payment_id?: string | null;
          payment_method?: string | null;
          payment_method_id?: string | null;
          payment_reference?: string | null;
          refund_amount?: number | null;
          refund_id?: string | null;
          refunded_at?: string | null;
          status?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      price_rules: {
        Row: {
          created_at: string | null;
          day_of_week: number | null;
          id: string;
          is_active: boolean | null;
          max_nights: number | null;
          min_nights: number | null;
          price_per_night: number;
          room_type_id: string;
          updated_at: string | null;
          valid_from: string;
          valid_to: string;
        };
        Insert: {
          created_at?: string | null;
          day_of_week?: number | null;
          id?: string;
          is_active?: boolean | null;
          max_nights?: number | null;
          min_nights?: number | null;
          price_per_night: number;
          room_type_id: string;
          updated_at?: string | null;
          valid_from: string;
          valid_to: string;
        };
        Update: {
          created_at?: string | null;
          day_of_week?: number | null;
          id?: string;
          is_active?: boolean | null;
          max_nights?: number | null;
          min_nights?: number | null;
          price_per_night?: number;
          room_type_id?: string;
          updated_at?: string | null;
          valid_from?: string;
          valid_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_rules_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          bio: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          full_name: string | null;
          hotel_ids: Json | null;
          id: string;
          last_name: string | null;
          nationality: string | null;
          phone: string | null;
          preferences: Json | null;
          profile_image: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          bio?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          hotel_ids?: Json | null;
          id: string;
          last_name?: string | null;
          nationality?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          profile_image?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          hotel_ids?: Json | null;
          id?: string;
          last_name?: string | null;
          nationality?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          profile_image?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      promotions: {
        Row: {
          code: string;
          created_at: string | null;
          description: string | null;
          discount_type: string | null;
          discount_value: number;
          hotel_id: string | null;
          id: string;
          is_active: boolean | null;
          max_discount: number | null;
          min_booking_amount: number | null;
          updated_at: string | null;
          usage_limit: number | null;
          used_count: number | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          description?: string | null;
          discount_type?: string | null;
          discount_value: number;
          hotel_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_discount?: number | null;
          min_booking_amount?: number | null;
          updated_at?: string | null;
          usage_limit?: number | null;
          used_count?: number | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          description?: string | null;
          discount_type?: string | null;
          discount_value?: number;
          hotel_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_discount?: number | null;
          min_booking_amount?: number | null;
          updated_at?: string | null;
          usage_limit?: number | null;
          used_count?: number | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "promotions_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      refund_transactions: {
        Row: {
          booking_id: string;
          cancellation_charge: number | null;
          completed_at: string | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          is_full_refund: boolean | null;
          notes: string | null;
          payment_id: string | null;
          processed_by: string | null;
          processed_by_user_id: string | null;
          refund_amount: number;
          refund_gateway_id: string | null;
          refund_reason: string | null;
          status: string | null;
          total_paid: number;
        };
        Insert: {
          booking_id: string;
          cancellation_charge?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          is_full_refund?: boolean | null;
          notes?: string | null;
          payment_id?: string | null;
          processed_by?: string | null;
          processed_by_user_id?: string | null;
          refund_amount: number;
          refund_gateway_id?: string | null;
          refund_reason?: string | null;
          status?: string | null;
          total_paid: number;
        };
        Update: {
          booking_id?: string;
          cancellation_charge?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          is_full_refund?: boolean | null;
          notes?: string | null;
          payment_id?: string | null;
          processed_by?: string | null;
          processed_by_user_id?: string | null;
          refund_amount?: number;
          refund_gateway_id?: string | null;
          refund_reason?: string | null;
          status?: string | null;
          total_paid?: number;
        };
        Relationships: [
          {
            foreignKeyName: "refund_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_transactions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      review_responses: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          responded_by: string | null;
          response_text: string;
          review_id: string;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          responded_by?: string | null;
          response_text: string;
          review_id: string;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          responded_by?: string | null;
          response_text?: string;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_responses_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_responses_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_responses_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: true;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          cleanliness_rating: number | null;
          comfort_rating: number | null;
          comment: string | null;
          created_at: string | null;
          facilities_rating: number | null;
          free_wifi_rating: number | null;
          helpful_count: number | null;
          hotel_id: string;
          id: string;
          image_urls: string[] | null;
          is_verified: boolean | null;
          location_rating: number | null;
          overall_rating: number | null;
          reviewer_avatar_url: string | null;
          reviewer_country: string | null;
          reviewer_name: string | null;
          staff_rating: number | null;
          status: string | null;
          stayed_date: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
          value_rating: number | null;
        };
        Insert: {
          booking_id: string;
          cleanliness_rating?: number | null;
          comfort_rating?: number | null;
          comment?: string | null;
          created_at?: string | null;
          facilities_rating?: number | null;
          free_wifi_rating?: number | null;
          helpful_count?: number | null;
          hotel_id: string;
          id?: string;
          image_urls?: string[] | null;
          is_verified?: boolean | null;
          location_rating?: number | null;
          overall_rating?: number | null;
          reviewer_avatar_url?: string | null;
          reviewer_country?: string | null;
          reviewer_name?: string | null;
          staff_rating?: number | null;
          status?: string | null;
          stayed_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
          value_rating?: number | null;
        };
        Update: {
          booking_id?: string;
          cleanliness_rating?: number | null;
          comfort_rating?: number | null;
          comment?: string | null;
          created_at?: string | null;
          facilities_rating?: number | null;
          free_wifi_rating?: number | null;
          helpful_count?: number | null;
          hotel_id?: string;
          id?: string;
          image_urls?: string[] | null;
          is_verified?: boolean | null;
          location_rating?: number | null;
          overall_rating?: number | null;
          reviewer_avatar_url?: string | null;
          reviewer_country?: string | null;
          reviewer_name?: string | null;
          staff_rating?: number | null;
          status?: string | null;
          stayed_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
          value_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      room_availability: {
        Row: {
          created_at: string | null;
          date: string;
          id: string;
          room_id: string;
          status: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          id?: string;
          room_id: string;
          status?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          id?: string;
          room_id?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_availability_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_inventory_blocks: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_date: string;
          hotel_id: string;
          id: string;
          reason: string | null;
          room_type_id: string;
          rooms_blocked: number;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_date: string;
          hotel_id: string;
          id?: string;
          reason?: string | null;
          room_type_id: string;
          rooms_blocked?: number;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string;
          hotel_id?: string;
          id?: string;
          reason?: string | null;
          room_type_id?: string;
          rooms_blocked?: number;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_inventory_blocks_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_inventory_blocks_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_inventory_blocks_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      room_type_amenities: {
        Row: {
          amenity_id: string;
          created_at: string | null;
          id: string;
          room_type_id: string;
        };
        Insert: {
          amenity_id: string;
          created_at?: string | null;
          id?: string;
          room_type_id: string;
        };
        Update: {
          amenity_id?: string;
          created_at?: string | null;
          id?: string;
          room_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_type_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_type_amenities_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      room_type_images: {
        Row: {
          alt_text: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          room_type_id: string;
          storage_path: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          room_type_id: string;
          storage_path?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          room_type_id?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_type_images_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      room_types: {
        Row: {
          base_price: number;
          bed_configuration: string | null;
          created_at: string | null;
          credit_card_required: boolean | null;
          description: string | null;
          free_cancellation_until: string | null;
          hotel_id: string;
          id: string;
          max_adults: number;
          max_children: number | null;
          max_occupancy: number;
          name: string;
          num_available_rooms: number | null;
          prepayment_required: boolean | null;
          size_sqm: number | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          base_price: number;
          bed_configuration?: string | null;
          created_at?: string | null;
          credit_card_required?: boolean | null;
          description?: string | null;
          free_cancellation_until?: string | null;
          hotel_id: string;
          id?: string;
          max_adults: number;
          max_children?: number | null;
          max_occupancy: number;
          name: string;
          num_available_rooms?: number | null;
          prepayment_required?: boolean | null;
          size_sqm?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          base_price?: number;
          bed_configuration?: string | null;
          created_at?: string | null;
          credit_card_required?: boolean | null;
          description?: string | null;
          free_cancellation_until?: string | null;
          hotel_id?: string;
          id?: string;
          max_adults?: number;
          max_children?: number | null;
          max_occupancy?: number;
          name?: string;
          num_available_rooms?: number | null;
          prepayment_required?: boolean | null;
          size_sqm?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          created_at: string | null;
          floor: number | null;
          hotel_id: string;
          id: string;
          room_number: string;
          room_type_id: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          floor?: number | null;
          hotel_id: string;
          id?: string;
          room_number: string;
          room_type_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          floor?: number | null;
          hotel_id?: string;
          id?: string;
          room_number?: string;
          room_type_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      special_offers: {
        Row: {
          badge_color: string | null;
          badge_text: string | null;
          created_at: string | null;
          description: string | null;
          hotel_id: string;
          id: string;
          is_active: boolean | null;
          title: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          badge_color?: string | null;
          badge_text?: string | null;
          created_at?: string | null;
          description?: string | null;
          hotel_id: string;
          id?: string;
          is_active?: boolean | null;
          title: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          badge_color?: string | null;
          badge_text?: string | null;
          created_at?: string | null;
          description?: string | null;
          hotel_id?: string;
          id?: string;
          is_active?: boolean | null;
          title?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "special_offers_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "special_offers_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      taxes_and_fees: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          is_active: boolean | null;
          is_included_in_price: boolean | null;
          tax_name: string;
          tax_type: string | null;
          tax_value: number;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          is_active?: boolean | null;
          is_included_in_price?: boolean | null;
          tax_name: string;
          tax_type?: string | null;
          tax_value: number;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          is_active?: boolean | null;
          is_included_in_price?: boolean | null;
          tax_name?: string;
          tax_type?: string | null;
          tax_value?: number;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "taxes_and_fees_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "taxes_and_fees_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_time_slots: {
        Row: {
          created_at: string | null;
          display_order: number | null;
          end_time: string;
          id: string;
          is_active: boolean | null;
          label: string | null;
          start_time: string;
          trip_type_id: string;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number | null;
          end_time: string;
          id?: string;
          is_active?: boolean | null;
          label?: string | null;
          start_time: string;
          trip_type_id: string;
        };
        Update: {
          created_at?: string | null;
          display_order?: number | null;
          end_time?: string;
          id?: string;
          is_active?: boolean | null;
          label?: string | null;
          start_time?: string;
          trip_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_time_slots_trip_type_id_fkey";
            columns: ["trip_type_id"];
            isOneToOne: false;
            referencedRelation: "trip_types";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_type_images: {
        Row: {
          alt_text: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          storage_path: string | null;
          trip_type_id: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          storage_path?: string | null;
          trip_type_id: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          storage_path?: string | null;
          trip_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_type_images_trip_type_id_fkey";
            columns: ["trip_type_id"];
            isOneToOne: false;
            referencedRelation: "trip_types";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_types: {
        Row: {
          boat_id: string;
          child_price_per_person: number | null;
          created_at: string | null;
          description: string | null;
          duration_minutes: number;
          free_cancellation_hours: number | null;
          id: string;
          includes_text: string | null;
          max_passengers: number;
          max_trips_per_day: number;
          min_passengers: number;
          name: string;
          price_per_boat: number | null;
          price_per_person: number | null;
          pricing_model: string;
          status: string;
          updated_at: string | null;
          what_to_bring_text: string | null;
        };
        Insert: {
          boat_id: string;
          child_price_per_person?: number | null;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          free_cancellation_hours?: number | null;
          id?: string;
          includes_text?: string | null;
          max_passengers?: number;
          max_trips_per_day?: number;
          min_passengers?: number;
          name: string;
          price_per_boat?: number | null;
          price_per_person?: number | null;
          pricing_model?: string;
          status?: string;
          updated_at?: string | null;
          what_to_bring_text?: string | null;
        };
        Update: {
          boat_id?: string;
          child_price_per_person?: number | null;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          free_cancellation_hours?: number | null;
          id?: string;
          includes_text?: string | null;
          max_passengers?: number;
          max_trips_per_day?: number;
          min_passengers?: number;
          name?: string;
          price_per_boat?: number | null;
          price_per_person?: number | null;
          pricing_model?: string;
          status?: string;
          updated_at?: string | null;
          what_to_bring_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trip_types_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotel_summary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      blogs_with_author: {
        Row: {
          author_email: string | null;
          author_id: string | null;
          content: string | null;
          created_at: string | null;
          excerpt: string | null;
          featured_image: string | null;
          id: string | null;
          meta_description: string | null;
          meta_title: string | null;
          published_at: string | null;
          slug: string | null;
          status: string | null;
          tags: string[] | null;
          title: string | null;
          updated_at: string | null;
          view_count: number | null;
        };
        Relationships: [];
      };
      hotel_summary: {
        Row: {
          avg_cleanliness_rating: number | null;
          avg_comfort_rating: number | null;
          avg_facilities_rating: number | null;
          avg_location_rating_review: number | null;
          avg_overall_rating: number | null;
          avg_staff_rating: number | null;
          avg_value_rating: number | null;
          avg_wifi_rating: number | null;
          city: string | null;
          id: string | null;
          location_rating: number | null;
          name: string | null;
          property_type: string | null;
          review_count: number | null;
          slug: string | null;
          star_rating: number | null;
          starting_price: number | null;
        };
        Relationships: [];
      };
      payment_reconciliation: {
        Row: {
          booking_amount: number | null;
          booking_date: string | null;
          booking_reference: string | null;
          payment_amount: number | null;
          payment_date: string | null;
          payment_gateway_payment_id: string | null;
          payment_status: string | null;
          refund_amount: number | null;
          refund_date: string | null;
        };
        Relationships: [];
      };
      refund_summary: {
        Row: {
          completed_refunds: number | null;
          failed_refunds: number | null;
          full_refunds: number | null;
          partial_refunds: number | null;
          pending_refunds: number | null;
          refund_date: string | null;
          total_cancellation_charges: number | null;
          total_refund_amount: number | null;
          total_refunds: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_blog_slug: { Args: { title: string }; Returns: string };
      generate_booking_reference: { Args: never; Returns: string };
      get_blogs_with_author: {
        Args: never;
        Returns: {
          author_email: string;
          author_id: string;
          content: string;
          created_at: string;
          excerpt: string;
          featured_image: string;
          id: string;
          meta_description: string;
          meta_title: string;
          published_at: string;
          slug: string;
          status: string;
          tags: string[];
          title: string;
          updated_at: string;
          view_count: number;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_hotel_admin: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
