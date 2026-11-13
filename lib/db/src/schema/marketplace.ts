import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("wasl_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull(),
  district: text("district").notNull(),
  role: text("role", { enum: ["customer", "provider", "admin"] }).notNull(),
  active: boolean("active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const categories = pgTable("wasl_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  subcategories: jsonb("subcategories").$type<string[]>().notNull().default([]),
});
export const profiles = pgTable("wasl_provider_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  bio: text("bio").notNull().default(""),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  experience: integer("experience").notNull().default(0),
  coverage: jsonb("coverage").$type<string[]>().notNull().default([]),
  avatar: text("avatar").notNull().default(""),
  portfolio: jsonb("portfolio").$type<string[]>().notNull().default([]),
  views: integer("views").notNull().default(0),
});
export const services = pgTable("wasl_services", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  priceHalalas: integer("price_halalas").notNull(),
  duration: text("duration").notNull(),
  delivery: text("delivery", { enum: ["customer_location", "provider_location", "remote"] }).notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [check("positive_service_price", sql`${t.priceHalalas} > 0`)]);
export const subscriptions = pgTable("wasl_subscriptions", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => users.id),
  plan: text("plan", { enum: ["basic", "professional"] }).notNull(),
  priceHalalas: integer("price_halalas").notNull(),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  simulated: boolean("simulated").notNull().default(true),
});
export const orders = pgTable("wasl_orders", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  serviceTitle: text("service_title").notNull(),
  customerId: text("customer_id").notNull().references(() => users.id),
  providerId: text("provider_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  scheduledAt: text("scheduled_at").notNull().default(""),
  location: text("location").notNull().default(""),
  priceHalalas: integer("price_halalas").notNull(),
  commissionHalalas: integer("commission_halalas").notNull(),
  totalHalalas: integer("total_halalas").notNull(),
  status: text("status", { enum: ["new", "accepted", "in_progress", "completed", "cancelled"] }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check("order_total_consistent", sql`${t.totalHalalas} = ${t.priceHalalas} + ${t.commissionHalalas}`),
  check("order_commission_ten_percent", sql`${t.commissionHalalas} = round(${t.priceHalalas}::numeric / 10)`),
]);
export const reviews = pgTable("wasl_reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  customerId: text("customer_id").notNull().references(() => users.id),
  providerId: text("provider_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("one_review_per_order").on(t.orderId), check("review_rating_range", sql`${t.rating} between 1 and 5`)]);
export const payments = pgTable("wasl_payments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amountHalalas: integer("amount_halalas").notNull(),
  simulated: boolean("simulated").notNull().default(true),
  status: text("status").notNull().default("simulated_paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const commissions = pgTable("wasl_commission_records", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique().references(() => orders.id),
  amountHalalas: integer("amount_halalas").notNull(),
  rate: integer("rate").notNull().default(10),
  status: text("status").notNull().default("pending"),
});
export const uploads = pgTable("wasl_uploads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  objectPath: text("object_path").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
});
export const bootstrapGrants = pgTable("wasl_bootstrap_grants", {
  email: text("email").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertOrderSchema = createInsertSchema(orders);
export type WaslUser = typeof users.$inferSelect;
