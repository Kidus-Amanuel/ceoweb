-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.databasechangelog (
  id character varying NOT NULL,
  author character varying NOT NULL,
  filename character varying NOT NULL,
  dateexecuted timestamp without time zone NOT NULL,
  orderexecuted integer NOT NULL,
  exectype character varying NOT NULL,
  md5sum character varying,
  description character varying,
  comments character varying,
  tag character varying,
  liquibase character varying,
  contexts character varying,
  labels character varying,
  deployment_id character varying
);
CREATE TABLE public.databasechangeloglock (
  id integer NOT NULL,
  locked boolean NOT NULL,
  lockgranted timestamp without time zone,
  lockedby character varying,
  CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_actions (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  actiontime timestamp without time zone NOT NULL,
  address character varying,
  userid integer,
  actiontype character varying NOT NULL,
  objecttype character varying,
  objectid integer,
  attributes character varying NOT NULL,
  CONSTRAINT tc_actions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_attributes (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  description character varying NOT NULL,
  type character varying NOT NULL,
  attribute character varying NOT NULL,
  expression character varying NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  CONSTRAINT tc_attributes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_calendars (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  data bytea NOT NULL,
  attributes character varying NOT NULL,
  CONSTRAINT tc_calendars_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_commands (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  description character varying NOT NULL,
  type character varying NOT NULL,
  textchannel boolean NOT NULL DEFAULT false,
  attributes character varying NOT NULL,
  CONSTRAINT tc_commands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_commands_queue (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  deviceid integer NOT NULL,
  type character varying NOT NULL,
  textchannel boolean NOT NULL DEFAULT false,
  attributes character varying NOT NULL,
  CONSTRAINT tc_commands_queue_pkey PRIMARY KEY (id),
  CONSTRAINT fk_commands_queue_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id)
);
CREATE TABLE public.tc_device_attribute (
  deviceid integer NOT NULL,
  attributeid integer NOT NULL,
  CONSTRAINT fk_user_device_attribute_attributeid FOREIGN KEY (attributeid) REFERENCES public.tc_attributes(id),
  CONSTRAINT fk_user_device_attribute_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id)
);
CREATE TABLE public.tc_device_command (
  deviceid integer NOT NULL,
  commandid integer NOT NULL,
  CONSTRAINT fk_device_command_commandid FOREIGN KEY (commandid) REFERENCES public.tc_commands(id),
  CONSTRAINT fk_device_command_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id)
);
CREATE TABLE public.tc_device_driver (
  deviceid integer NOT NULL,
  driverid integer NOT NULL,
  CONSTRAINT fk_device_driver_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_driver_driverid FOREIGN KEY (driverid) REFERENCES public.tc_drivers(id)
);
CREATE TABLE public.tc_device_geofence (
  deviceid integer NOT NULL,
  geofenceid integer NOT NULL,
  CONSTRAINT fk_device_geofence_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_geofence_geofenceid FOREIGN KEY (geofenceid) REFERENCES public.tc_geofences(id)
);
CREATE TABLE public.tc_device_maintenance (
  deviceid integer NOT NULL,
  maintenanceid integer NOT NULL,
  CONSTRAINT fk_device_maintenance_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_maintenance_maintenanceid FOREIGN KEY (maintenanceid) REFERENCES public.tc_maintenances(id)
);
CREATE TABLE public.tc_device_notification (
  deviceid integer NOT NULL,
  notificationid integer NOT NULL,
  CONSTRAINT fk_device_notification_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_notification_notificationid FOREIGN KEY (notificationid) REFERENCES public.tc_notifications(id)
);
CREATE TABLE public.tc_device_order (
  deviceid integer NOT NULL,
  orderid integer NOT NULL,
  CONSTRAINT fk_device_order_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_order_orderid FOREIGN KEY (orderid) REFERENCES public.tc_orders(id)
);
CREATE TABLE public.tc_device_report (
  deviceid integer NOT NULL,
  reportid integer NOT NULL,
  CONSTRAINT fk_device_report_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_device_report_reportid FOREIGN KEY (reportid) REFERENCES public.tc_reports(id)
);
CREATE TABLE public.tc_devices (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  uniqueid character varying NOT NULL UNIQUE,
  lastupdate timestamp without time zone,
  positionid integer,
  groupid integer,
  attributes character varying,
  phone character varying,
  model character varying,
  contact character varying,
  category character varying,
  disabled boolean DEFAULT false,
  status character,
  expirationtime timestamp without time zone,
  motionstate boolean DEFAULT false,
  motiontime timestamp without time zone,
  motiondistance double precision DEFAULT 0,
  overspeedstate boolean DEFAULT false,
  overspeedtime timestamp without time zone,
  overspeedgeofenceid integer DEFAULT 0,
  motionstreak boolean DEFAULT false,
  calendarid integer,
  motionpositionid integer,
  CONSTRAINT tc_devices_pkey PRIMARY KEY (id),
  CONSTRAINT fk_devices_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_devices_calendarid FOREIGN KEY (calendarid) REFERENCES public.tc_calendars(id)
);
CREATE TABLE public.tc_drivers (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  uniqueid character varying NOT NULL UNIQUE,
  attributes character varying NOT NULL,
  CONSTRAINT tc_drivers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_events (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  type character varying NOT NULL,
  eventtime timestamp without time zone NOT NULL,
  deviceid integer,
  positionid integer,
  geofenceid integer,
  attributes character varying,
  maintenanceid integer,
  CONSTRAINT tc_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_geofences (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  description character varying,
  area character varying NOT NULL,
  attributes character varying,
  calendarid integer,
  CONSTRAINT tc_geofences_pkey PRIMARY KEY (id),
  CONSTRAINT fk_geofence_calendar_calendarid FOREIGN KEY (calendarid) REFERENCES public.tc_calendars(id)
);
CREATE TABLE public.tc_group_attribute (
  groupid integer NOT NULL,
  attributeid integer NOT NULL,
  CONSTRAINT fk_group_attribute_attributeid FOREIGN KEY (attributeid) REFERENCES public.tc_attributes(id),
  CONSTRAINT fk_group_attribute_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id)
);
CREATE TABLE public.tc_group_command (
  groupid integer NOT NULL,
  commandid integer NOT NULL,
  CONSTRAINT fk_group_command_commandid FOREIGN KEY (commandid) REFERENCES public.tc_commands(id),
  CONSTRAINT fk_group_command_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id)
);
CREATE TABLE public.tc_group_driver (
  groupid integer NOT NULL,
  driverid integer NOT NULL,
  CONSTRAINT fk_group_driver_driverid FOREIGN KEY (driverid) REFERENCES public.tc_drivers(id),
  CONSTRAINT fk_group_driver_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id)
);
CREATE TABLE public.tc_group_geofence (
  groupid integer NOT NULL,
  geofenceid integer NOT NULL,
  CONSTRAINT fk_group_geofence_geofenceid FOREIGN KEY (geofenceid) REFERENCES public.tc_geofences(id),
  CONSTRAINT fk_group_geofence_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id)
);
CREATE TABLE public.tc_group_maintenance (
  groupid integer NOT NULL,
  maintenanceid integer NOT NULL,
  CONSTRAINT fk_group_maintenance_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_group_maintenance_maintenanceid FOREIGN KEY (maintenanceid) REFERENCES public.tc_maintenances(id)
);
CREATE TABLE public.tc_group_notification (
  groupid integer NOT NULL,
  notificationid integer NOT NULL,
  CONSTRAINT fk_group_notification_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_group_notification_notificationid FOREIGN KEY (notificationid) REFERENCES public.tc_notifications(id)
);
CREATE TABLE public.tc_group_order (
  groupid integer NOT NULL,
  orderid integer NOT NULL,
  CONSTRAINT fk_group_order_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_group_order_orderid FOREIGN KEY (orderid) REFERENCES public.tc_orders(id)
);
CREATE TABLE public.tc_group_report (
  groupid integer NOT NULL,
  reportid integer NOT NULL,
  CONSTRAINT fk_group_report_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_group_report_reportid FOREIGN KEY (reportid) REFERENCES public.tc_reports(id)
);
CREATE TABLE public.tc_groups (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  groupid integer,
  attributes character varying,
  CONSTRAINT tc_groups_pkey PRIMARY KEY (id),
  CONSTRAINT fk_groups_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id)
);
CREATE TABLE public.tc_keystore (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  publickey bytea NOT NULL,
  privatekey bytea NOT NULL,
  CONSTRAINT tc_keystore_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_maintenances (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL,
  start double precision NOT NULL DEFAULT 0,
  period double precision NOT NULL DEFAULT 0,
  attributes character varying NOT NULL,
  CONSTRAINT tc_maintenances_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_notifications (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  type character varying NOT NULL,
  attributes character varying,
  always boolean NOT NULL DEFAULT false,
  calendarid integer,
  notificators character varying,
  commandid integer,
  description character varying,
  CONSTRAINT tc_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_notification_calendar_calendarid FOREIGN KEY (calendarid) REFERENCES public.tc_calendars(id),
  CONSTRAINT fk_notifications_commandid FOREIGN KEY (commandid) REFERENCES public.tc_commands(id)
);
CREATE TABLE public.tc_orders (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  uniqueid character varying NOT NULL,
  description character varying,
  fromaddress character varying,
  toaddress character varying,
  attributes character varying NOT NULL,
  CONSTRAINT tc_orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_positions (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  protocol character varying,
  deviceid integer NOT NULL,
  servertime timestamp without time zone NOT NULL DEFAULT now(),
  devicetime timestamp without time zone NOT NULL,
  fixtime timestamp without time zone NOT NULL,
  valid boolean NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude double precision NOT NULL,
  speed double precision NOT NULL,
  course double precision NOT NULL,
  address character varying,
  attributes character varying,
  accuracy double precision NOT NULL DEFAULT 0,
  network character varying,
  geofenceids character varying,
  CONSTRAINT tc_positions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_reports (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  type character varying NOT NULL,
  description character varying NOT NULL,
  calendarid integer NOT NULL,
  attributes character varying NOT NULL,
  CONSTRAINT tc_reports_pkey PRIMARY KEY (id),
  CONSTRAINT fk_reports_calendarid FOREIGN KEY (calendarid) REFERENCES public.tc_calendars(id)
);
CREATE TABLE public.tc_revoked_tokens (
  id bigint NOT NULL,
  CONSTRAINT tc_revoked_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_servers (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  registration boolean NOT NULL DEFAULT false,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  zoom integer NOT NULL DEFAULT 0,
  map character varying,
  bingkey character varying,
  mapurl character varying,
  readonly boolean NOT NULL DEFAULT false,
  attributes character varying,
  forcesettings boolean NOT NULL DEFAULT false,
  coordinateformat character varying,
  devicereadonly boolean DEFAULT false,
  limitcommands boolean DEFAULT false,
  poilayer character varying,
  announcement character varying,
  disablereports boolean DEFAULT false,
  overlayurl character varying,
  fixedemail boolean DEFAULT false,
  CONSTRAINT tc_servers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_statistics (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  capturetime timestamp without time zone NOT NULL,
  activeusers integer NOT NULL DEFAULT 0,
  activedevices integer NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 0,
  messagesreceived integer NOT NULL DEFAULT 0,
  messagesstored integer NOT NULL DEFAULT 0,
  attributes character varying NOT NULL,
  mailsent integer NOT NULL DEFAULT 0,
  smssent integer NOT NULL DEFAULT 0,
  geocoderrequests integer NOT NULL DEFAULT 0,
  geolocationrequests integer NOT NULL DEFAULT 0,
  protocols character varying,
  CONSTRAINT tc_statistics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tc_user_attribute (
  userid integer NOT NULL,
  attributeid integer NOT NULL,
  CONSTRAINT fk_user_attribute_attributeid FOREIGN KEY (attributeid) REFERENCES public.tc_attributes(id),
  CONSTRAINT fk_user_attribute_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_calendar (
  userid integer NOT NULL,
  calendarid integer NOT NULL,
  CONSTRAINT fk_user_calendar_calendarid FOREIGN KEY (calendarid) REFERENCES public.tc_calendars(id),
  CONSTRAINT fk_user_calendar_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_command (
  userid integer NOT NULL,
  commandid integer NOT NULL,
  CONSTRAINT fk_user_command_commandid FOREIGN KEY (commandid) REFERENCES public.tc_commands(id),
  CONSTRAINT fk_user_command_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_device (
  userid integer NOT NULL,
  deviceid integer NOT NULL,
  CONSTRAINT fk_user_device_deviceid FOREIGN KEY (deviceid) REFERENCES public.tc_devices(id),
  CONSTRAINT fk_user_device_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_driver (
  userid integer NOT NULL,
  driverid integer NOT NULL,
  CONSTRAINT fk_user_driver_driverid FOREIGN KEY (driverid) REFERENCES public.tc_drivers(id),
  CONSTRAINT fk_user_driver_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_geofence (
  userid integer NOT NULL,
  geofenceid integer NOT NULL,
  CONSTRAINT fk_user_geofence_geofenceid FOREIGN KEY (geofenceid) REFERENCES public.tc_geofences(id),
  CONSTRAINT fk_user_geofence_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_group (
  userid integer NOT NULL,
  groupid integer NOT NULL,
  CONSTRAINT fk_user_group_groupid FOREIGN KEY (groupid) REFERENCES public.tc_groups(id),
  CONSTRAINT fk_user_group_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_maintenance (
  userid integer NOT NULL,
  maintenanceid integer NOT NULL,
  CONSTRAINT fk_user_maintenance_maintenanceid FOREIGN KEY (maintenanceid) REFERENCES public.tc_maintenances(id),
  CONSTRAINT fk_user_maintenance_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_notification (
  userid integer NOT NULL,
  notificationid integer NOT NULL,
  CONSTRAINT fk_user_notification_notificationid FOREIGN KEY (notificationid) REFERENCES public.tc_notifications(id),
  CONSTRAINT fk_user_notification_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_user_order (
  userid integer NOT NULL,
  orderid integer NOT NULL,
  CONSTRAINT fk_user_order_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id),
  CONSTRAINT fk_user_order_orderid FOREIGN KEY (orderid) REFERENCES public.tc_orders(id)
);
CREATE TABLE public.tc_user_report (
  userid integer NOT NULL,
  reportid integer NOT NULL,
  CONSTRAINT fk_user_report_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id),
  CONSTRAINT fk_user_report_reportid FOREIGN KEY (reportid) REFERENCES public.tc_reports(id)
);
CREATE TABLE public.tc_user_user (
  userid integer NOT NULL,
  manageduserid integer NOT NULL,
  CONSTRAINT fk_user_user_userid FOREIGN KEY (userid) REFERENCES public.tc_users(id),
  CONSTRAINT fk_user_user_manageduserid FOREIGN KEY (manageduserid) REFERENCES public.tc_users(id)
);
CREATE TABLE public.tc_users (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  hashedpassword character varying,
  salt character varying,
  readonly boolean NOT NULL DEFAULT false,
  administrator boolean,
  map character varying,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  zoom integer NOT NULL DEFAULT 0,
  attributes character varying,
  coordinateformat character varying,
  disabled boolean DEFAULT false,
  expirationtime timestamp without time zone,
  devicelimit integer DEFAULT '-1'::integer,
  userlimit integer DEFAULT 0,
  devicereadonly boolean DEFAULT false,
  phone character varying,
  limitcommands boolean DEFAULT false,
  login character varying,
  poilayer character varying,
  disablereports boolean DEFAULT false,
  fixedemail boolean DEFAULT false,
  totpkey character varying,
  temporary boolean DEFAULT false,
  CONSTRAINT tc_users_pkey PRIMARY KEY (id)
);