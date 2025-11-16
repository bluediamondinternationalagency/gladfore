


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."guarantor_type" AS ENUM (
    'chief',
    'religious_leader'
);


ALTER TYPE "public"."guarantor_type" OWNER TO "postgres";


CREATE TYPE "public"."id_type" AS ENUM (
    'national_id',
    'voters_card',
    'drivers_license',
    'passport'
);


ALTER TYPE "public"."id_type" OWNER TO "postgres";


CREATE TYPE "public"."kyc_status" AS ENUM (
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE "public"."kyc_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'payment_reminder',
    'order_update',
    'credit_limit',
    'general'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'delivered',
    'completed'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'completed',
    'failed'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'down_payment',
    'balance_payment',
    'commission'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'agent',
    'farmer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_available_credit"("farmer_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    credit_limit DECIMAL;
    outstanding_balance DECIMAL;
BEGIN
    SELECT fp.credit_limit INTO credit_limit
    FROM farmer_profiles fp
    WHERE fp.id = farmer_uuid;
    
    SELECT COALESCE(SUM(o.balance), 0) INTO outstanding_balance
    FROM orders o
    WHERE o.farmer_id = farmer_uuid 
    AND o.status IN ('approved', 'delivered');
    
    RETURN GREATEST(credit_limit - outstanding_balance, 0);
END;
$$;


ALTER FUNCTION "public"."calculate_available_credit"("farmer_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_credit_score"("farmer_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_orders INTEGER;
    completed_orders INTEGER;
    overdue_orders INTEGER;
    on_time_payments INTEGER;
    new_score INTEGER;
    old_score INTEGER;
BEGIN
    SELECT credit_score INTO old_score
    FROM farmer_profiles
    WHERE id = farmer_uuid;
    
    SELECT COUNT(*) INTO total_orders
    FROM orders WHERE farmer_id = farmer_uuid;
    
    SELECT COUNT(*) INTO completed_orders
    FROM orders 
    WHERE farmer_id = farmer_uuid AND status = 'completed';
    
    SELECT COUNT(*) INTO overdue_orders
    FROM orders 
    WHERE farmer_id = farmer_uuid 
    AND status IN ('approved', 'delivered')
    AND due_date < CURRENT_DATE 
    AND balance > 0;
    
    SELECT COUNT(*) INTO on_time_payments
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE o.farmer_id = farmer_uuid 
    AND p.status = 'completed'
    AND p.created_at <= o.due_date;
    
    new_score := LEAST(100, GREATEST(0,
        50 +
        (CASE WHEN total_orders > 0 THEN (completed_orders * 30 / total_orders) ELSE 0 END) +
        (CASE WHEN total_orders > 0 THEN (on_time_payments * 20 / total_orders) ELSE 0 END) -
        (overdue_orders * 10)
    ));
    
    UPDATE farmer_profiles
    SET credit_score = new_score,
        available_credit = calculate_available_credit(farmer_uuid)
    WHERE id = farmer_uuid;
    
    INSERT INTO credit_history (farmer_id, previous_score, new_score, change_reason)
    VALUES (farmer_uuid, old_score, new_score, 'Automatic score calculation based on payment behavior');
END;
$$;


ALTER FUNCTION "public"."update_credit_score"("farmer_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_farmer_available_credit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE farmer_profiles
    SET available_credit = calculate_available_credit(NEW.farmer_id)
    WHERE id = NEW.farmer_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_farmer_available_credit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_commissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "payment_id" "uuid",
    "commission_type" character varying(50),
    "amount" numeric(12,2) NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_commissions_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."agent_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "region" character varying(100),
    "commission_rate" numeric(5,2) DEFAULT 2.50,
    "collection_commission_rate" numeric(5,2) DEFAULT 1.00,
    "total_sales" numeric(12,2) DEFAULT 0.00,
    "total_commission_earned" numeric(12,2) DEFAULT 0.00,
    "pending_commission" numeric(12,2) DEFAULT 0.00,
    "is_suspended" boolean DEFAULT false,
    "suspension_reason" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."agent_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(50),
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "previous_score" integer,
    "new_score" integer,
    "change_reason" "text",
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."credit_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "farm_size" character varying(50),
    "farm_location" "text",
    "crop_types" "text"[],
    "id_type" "public"."id_type" NOT NULL,
    "id_number" character varying(50) NOT NULL,
    "id_document_url" "text",
    "guarantor_name" character varying(255),
    "guarantor_phone" character varying(20),
    "guarantor_type" "public"."guarantor_type",
    "guarantor_document_url" "text",
    "kyc_status" "public"."kyc_status" DEFAULT 'pending'::"public"."kyc_status",
    "kyc_verified_at" timestamp with time zone,
    "kyc_verified_by" "uuid",
    "kyc_rejection_reason" "text",
    "credit_limit" numeric(12,2) DEFAULT 0.00,
    "credit_score" integer DEFAULT 50,
    "available_credit" numeric(12,2) DEFAULT 0.00,
    "total_borrowed" numeric(12,2) DEFAULT 0.00,
    "total_repaid" numeric(12,2) DEFAULT 0.00,
    "default_count" integer DEFAULT 0,
    "is_blacklisted" boolean DEFAULT false,
    "blacklist_reason" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "farmer_profiles_credit_score_check" CHECK ((("credit_score" >= 0) AND ("credit_score" <= 100)))
);


ALTER TABLE "public"."farmer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farmer_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "agent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farmers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "farmer_id" "uuid",
    "agent_id" "uuid",
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "valid_total" CHECK (("total_price" = (("quantity")::numeric * "unit_price")))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "total_cost" numeric(12,2) NOT NULL,
    "down_payment" numeric(12,2) NOT NULL,
    "balance" numeric(12,2) NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "due_date" "date" NOT NULL,
    "harvest_season" character varying(50),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "delivery_address" "text",
    "delivery_date" "date",
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valid_balance" CHECK (("balance" = ("total_cost" - "down_payment"))),
    CONSTRAINT "valid_down_payment" CHECK (("down_payment" >= ("total_cost" * 0.5)))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "payment_type" "public"."payment_type" NOT NULL,
    "payment_method" character varying(50),
    "payment_reference" character varying(100),
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "processed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100),
    "unit_price" numeric(12,2) NOT NULL,
    "unit_measure" character varying(50),
    "stock_quantity" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255),
    "phone" character varying(20) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "role" "public"."user_role" DEFAULT 'farmer'::"public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_profiles"
    ADD CONSTRAINT "farmer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_profiles"
    ADD CONSTRAINT "farmer_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."farmers"
    ADD CONSTRAINT "farmers_farmer_id_key" UNIQUE ("farmer_id");



ALTER TABLE ONLY "public"."farmers"
    ADD CONSTRAINT "farmers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_agent_commissions_agent_id" ON "public"."agent_commissions" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_commissions_order_id" ON "public"."agent_commissions" USING "btree" ("order_id");



CREATE INDEX "idx_agent_commissions_status" ON "public"."agent_commissions" USING "btree" ("status");



CREATE INDEX "idx_agent_profiles_user_id" ON "public"."agent_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity_id" ON "public"."audit_logs" USING "btree" ("entity_id");



CREATE INDEX "idx_audit_logs_entity_type" ON "public"."audit_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_credit_history_created_at" ON "public"."credit_history" USING "btree" ("created_at");



CREATE INDEX "idx_credit_history_farmer_id" ON "public"."credit_history" USING "btree" ("farmer_id");



CREATE INDEX "idx_farmer_profiles_kyc_status" ON "public"."farmer_profiles" USING "btree" ("kyc_status");



CREATE INDEX "idx_farmer_profiles_user_id" ON "public"."farmer_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_agent_id" ON "public"."orders" USING "btree" ("agent_id");



CREATE INDEX "idx_orders_farmer_id" ON "public"."orders" USING "btree" ("farmer_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_payments_farmer_id" ON "public"."payments" USING "btree" ("farmer_id");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "trg_farmers_updated_at" BEFORE UPDATE ON "public"."farmers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_available_credit" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_farmer_available_credit"();



CREATE OR REPLACE TRIGGER "update_agent_profiles_updated_at" BEFORE UPDATE ON "public"."agent_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_farmer_profiles_updated_at" BEFORE UPDATE ON "public"."farmer_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farmer_profiles"
    ADD CONSTRAINT "farmer_profiles_kyc_verified_by_fkey" FOREIGN KEY ("kyc_verified_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."farmer_profiles"
    ADD CONSTRAINT "farmer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



CREATE POLICY "Agents can insert their own farmers" ON "public"."farmers" FOR INSERT WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can view their own farmers" ON "public"."farmers" FOR SELECT USING (("agent_id" = "auth"."uid"()));



CREATE POLICY "admin_all_access" ON "public"."farmer_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_agent_commissions" ON "public"."agent_commissions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_agent_profiles" ON "public"."agent_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_audit_logs" ON "public"."audit_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_credit_history" ON "public"."credit_history" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_farmer_profiles" ON "public"."farmer_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_notifications" ON "public"."notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_orders" ON "public"."orders" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_payments" ON "public"."payments" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "agent_assigned_orders" ON "public"."orders" USING (("agent_id" IN ( SELECT "agent_profiles"."id"
   FROM "public"."agent_profiles"
  WHERE ("agent_profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."agent_commissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_own_commissions" ON "public"."agent_commissions" FOR SELECT USING (("agent_id" IN ( SELECT "agent_profiles"."id"
   FROM "public"."agent_profiles"
  WHERE ("agent_profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farmer_own_credit_history" ON "public"."credit_history" FOR SELECT USING (("farmer_id" IN ( SELECT "farmer_profiles"."id"
   FROM "public"."farmer_profiles"
  WHERE ("farmer_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "farmer_own_notifications" ON "public"."notifications" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "farmer_own_orders" ON "public"."orders" FOR SELECT USING (("farmer_id" IN ( SELECT "farmer_profiles"."id"
   FROM "public"."farmer_profiles"
  WHERE ("farmer_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "farmer_own_payments" ON "public"."payments" FOR SELECT USING (("farmer_id" IN ( SELECT "farmer_profiles"."id"
   FROM "public"."farmer_profiles"
  WHERE ("farmer_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "farmer_own_profile" ON "public"."farmer_profiles" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."farmer_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_available_credit"("farmer_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_available_credit"("farmer_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_available_credit"("farmer_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_credit_score"("farmer_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_credit_score"("farmer_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_credit_score"("farmer_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_farmer_available_credit"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_farmer_available_credit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_farmer_available_credit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agent_commissions" TO "anon";
GRANT ALL ON TABLE "public"."agent_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."agent_profiles" TO "anon";
GRANT ALL ON TABLE "public"."agent_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."credit_history" TO "anon";
GRANT ALL ON TABLE "public"."credit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_history" TO "service_role";



GRANT ALL ON TABLE "public"."farmer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."farmer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."farmers" TO "anon";
GRANT ALL ON TABLE "public"."farmers" TO "authenticated";
GRANT ALL ON TABLE "public"."farmers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































