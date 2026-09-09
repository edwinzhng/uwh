/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as account_actions from "../account_actions.js";
import type * as account_emails from "../account_emails.js";
import type * as account_erasure from "../account_erasure.js";
import type * as action_data from "../action_data.js";
import type * as action_validator from "../action_validator.js";
import type * as attendance from "../attendance.js";
import type * as attendance_report_schema from "../attendance_report_schema.js";
import type * as attendance_reports from "../attendance_reports.js";
import type * as auth from "../auth.js";
import type * as auth_email from "../auth_email.js";
import type * as auth_mail from "../auth_mail.js";
import type * as auth_sessions from "../auth_sessions.js";
import type * as auth_users from "../auth_users.js";
import type * as calendar from "../calendar.js";
import type * as calendar_http from "../calendar_http.js";
import type * as calendar_schema from "../calendar_schema.js";
import type * as calendar_tokens from "../calendar_tokens.js";
import type * as chat_policy from "../chat_policy.js";
import type * as club from "../club.js";
import type * as coaching_hours from "../coaching_hours.js";
import type * as coaching_hours_schema from "../coaching_hours_schema.js";
import type * as connected_accounts from "../connected_accounts.js";
import type * as connection_actions from "../connection_actions.js";
import type * as connection_schema from "../connection_schema.js";
import type * as crons from "../crons.js";
import type * as data from "../data.js";
import type * as event_validator from "../event_validator.js";
import type * as fitness from "../fitness.js";
import type * as fitness_schema from "../fitness_schema.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as image_http from "../image_http.js";
import type * as images from "../images.js";
import type * as import_apply from "../import_apply.js";
import type * as import_plan from "../import_plan.js";
import type * as import_schema from "../import_schema.js";
import type * as imports from "../imports.js";
import type * as invite_delivery from "../invite_delivery.js";
import type * as invite_helpers from "../invite_helpers.js";
import type * as invite_schema from "../invite_schema.js";
import type * as invites from "../invites.js";
import type * as local_checks from "../local_checks.js";
import type * as local_email from "../local_email.js";
import type * as local_invites from "../local_invites.js";
import type * as local_social from "../local_social.js";
import type * as message_access from "../message_access.js";
import type * as message_commands from "../message_commands.js";
import type * as messaging from "../messaging.js";
import type * as moderation from "../moderation.js";
import type * as notification_events from "../notification_events.js";
import type * as notifications from "../notifications.js";
import type * as pages from "../pages.js";
import type * as player_coaching from "../player_coaching.js";
import type * as player_coaching_schema from "../player_coaching_schema.js";
import type * as public_calendar from "../public_calendar.js";
import type * as public_schedule from "../public_schedule.js";
import type * as push_transport from "../push_transport.js";
import type * as screen_data from "../screen_data.js";
import type * as season_records from "../season_records.js";
import type * as season_schema from "../season_schema.js";
import type * as security_cleanup from "../security_cleanup.js";
import type * as security_schema from "../security_schema.js";
import type * as signup from "../signup.js";
import type * as social_config from "../social_config.js";
import type * as thread_access from "../thread_access.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  account_actions: typeof account_actions;
  account_emails: typeof account_emails;
  account_erasure: typeof account_erasure;
  action_data: typeof action_data;
  action_validator: typeof action_validator;
  attendance: typeof attendance;
  attendance_report_schema: typeof attendance_report_schema;
  attendance_reports: typeof attendance_reports;
  auth: typeof auth;
  auth_email: typeof auth_email;
  auth_mail: typeof auth_mail;
  auth_sessions: typeof auth_sessions;
  auth_users: typeof auth_users;
  calendar: typeof calendar;
  calendar_http: typeof calendar_http;
  calendar_schema: typeof calendar_schema;
  calendar_tokens: typeof calendar_tokens;
  chat_policy: typeof chat_policy;
  club: typeof club;
  coaching_hours: typeof coaching_hours;
  coaching_hours_schema: typeof coaching_hours_schema;
  connected_accounts: typeof connected_accounts;
  connection_actions: typeof connection_actions;
  connection_schema: typeof connection_schema;
  crons: typeof crons;
  data: typeof data;
  event_validator: typeof event_validator;
  fitness: typeof fitness;
  fitness_schema: typeof fitness_schema;
  http: typeof http;
  identity: typeof identity;
  image_http: typeof image_http;
  images: typeof images;
  import_apply: typeof import_apply;
  import_plan: typeof import_plan;
  import_schema: typeof import_schema;
  imports: typeof imports;
  invite_delivery: typeof invite_delivery;
  invite_helpers: typeof invite_helpers;
  invite_schema: typeof invite_schema;
  invites: typeof invites;
  local_checks: typeof local_checks;
  local_email: typeof local_email;
  local_invites: typeof local_invites;
  local_social: typeof local_social;
  message_access: typeof message_access;
  message_commands: typeof message_commands;
  messaging: typeof messaging;
  moderation: typeof moderation;
  notification_events: typeof notification_events;
  notifications: typeof notifications;
  pages: typeof pages;
  player_coaching: typeof player_coaching;
  player_coaching_schema: typeof player_coaching_schema;
  public_calendar: typeof public_calendar;
  public_schedule: typeof public_schedule;
  push_transport: typeof push_transport;
  screen_data: typeof screen_data;
  season_records: typeof season_records;
  season_schema: typeof season_schema;
  security_cleanup: typeof security_cleanup;
  security_schema: typeof security_schema;
  signup: typeof signup;
  social_config: typeof social_config;
  thread_access: typeof thread_access;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
