-- Esquema de SIGEJA (PostgreSQL 16 + pgvector). Generado con: pg_dump --schema-only --no-owner --no-privileges
-- Docker lo aplica solo la primera vez que crea la base (ver docker-compose.yml). Local: psql -U postgres -d sigeja_db -f Backend/schema.sql
--
-- PostgreSQL database dump
--

\restrict 3DeIg5n7R3lWJqk5j6xaSSCrmJsMwKKUZnbbjqNE4ftZoPWgY1Ir0aOGXwliJk9

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg12+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg12+1)

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

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: feedback_analisis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_analisis (
    id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    numero_expediente text,
    usuario text,
    tipo text,
    rating integer,
    comentario text,
    metadata jsonb
);


--
-- Name: feedback_analisis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_analisis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_analisis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_analisis_id_seq OWNED BY public.feedback_analisis.id;


--
-- Name: log_seguridad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_seguridad (
    id integer NOT NULL,
    "timestamp" timestamp without time zone,
    usuario character varying(100),
    accion_registrada text,
    expediente character varying(100),
    ip_origen character varying(50)
);


--
-- Name: log_seguridad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_seguridad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_seguridad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_seguridad_id_seq OWNED BY public.log_seguridad.id;


--
-- Name: metricas_validacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metricas_validacion (
    id integer NOT NULL,
    numero_expediente text NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario text,
    ocr_accuracy real,
    ocr_cer real,
    ocr_ref_chars integer,
    ocr_generated_chars integer,
    ner_precision real,
    ner_recall real,
    ner_f1 real,
    ner_detection_accuracy real,
    ner_assignment_accuracy real,
    ner_integral_accuracy real,
    bert_precision real,
    bert_recall real,
    bert_f1 real,
    referencias_ner jsonb,
    predicciones_ner jsonb,
    resumen_referencia text,
    resumen_generado text,
    detalle jsonb
);


--
-- Name: metricas_validacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metricas_validacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metricas_validacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metricas_validacion_id_seq OWNED BY public.metricas_validacion.id;


--
-- Name: ocr_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocr_documentos (
    id integer NOT NULL,
    numero_expediente text NOT NULL,
    nombre_archivo text NOT NULL,
    documento_index integer DEFAULT 0,
    sha256 text NOT NULL,
    modo_ocr text DEFAULT 'std'::text NOT NULL,
    texto_ocr text NOT NULL,
    ocr_precision real,
    metodo text,
    chars integer DEFAULT 0,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ocr_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocr_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocr_documentos_id_seq OWNED BY public.ocr_documentos.id;


--
-- Name: registro_expedientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_expedientes (
    id integer NOT NULL,
    numero_expediente character varying(100) NOT NULL,
    fecha_analisis timestamp without time zone,
    demandante character varying(200),
    demandado character varying(200),
    monto_petitorio numeric(10,2),
    estado_auditoria character varying(50),
    riesgo_capacidad character varying(50),
    tiempo_procesamiento_seg numeric(8,2),
    paginas_ocr integer,
    bert_score numeric(5,2),
    f1_ner numeric(5,2),
    ocr_precision numeric(5,2),
    json_resultados jsonb,
    ocr_detalle jsonb,
    asignado_juez character varying(100) DEFAULT NULL::character varying,
    asignado_secretario character varying(100) DEFAULT NULL::character varying,
    asignado_asistente character varying(100) DEFAULT NULL::character varying,
    asignado_mesapartes character varying(100) DEFAULT NULL::character varying,
    asignado_liquidador character varying(100) DEFAULT NULL::character varying,
    embedding public.vector(768)
);


--
-- Name: registro_expedientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_expedientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registro_expedientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_expedientes_id_seq OWNED BY public.registro_expedientes.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    nombre character varying(150) NOT NULL,
    cargo character varying(100),
    rol character varying(50),
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_failed_login timestamp without time zone,
    password_changed_at timestamp without time zone,
    reset_token_hash text,
    reset_token_expires_at timestamp without time zone
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: feedback_analisis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_analisis ALTER COLUMN id SET DEFAULT nextval('public.feedback_analisis_id_seq'::regclass);


--
-- Name: log_seguridad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_seguridad ALTER COLUMN id SET DEFAULT nextval('public.log_seguridad_id_seq'::regclass);


--
-- Name: metricas_validacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_validacion ALTER COLUMN id SET DEFAULT nextval('public.metricas_validacion_id_seq'::regclass);


--
-- Name: ocr_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_documentos ALTER COLUMN id SET DEFAULT nextval('public.ocr_documentos_id_seq'::regclass);


--
-- Name: registro_expedientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_expedientes ALTER COLUMN id SET DEFAULT nextval('public.registro_expedientes_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: feedback_analisis feedback_analisis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_analisis
    ADD CONSTRAINT feedback_analisis_pkey PRIMARY KEY (id);


--
-- Name: log_seguridad log_seguridad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_seguridad
    ADD CONSTRAINT log_seguridad_pkey PRIMARY KEY (id);


--
-- Name: metricas_validacion metricas_validacion_numero_expediente_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_validacion
    ADD CONSTRAINT metricas_validacion_numero_expediente_key UNIQUE (numero_expediente);


--
-- Name: metricas_validacion metricas_validacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_validacion
    ADD CONSTRAINT metricas_validacion_pkey PRIMARY KEY (id);


--
-- Name: ocr_documentos ocr_documentos_numero_expediente_nombre_archivo_modo_ocr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_documentos
    ADD CONSTRAINT ocr_documentos_numero_expediente_nombre_archivo_modo_ocr_key UNIQUE (numero_expediente, nombre_archivo, modo_ocr);


--
-- Name: ocr_documentos ocr_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_documentos
    ADD CONSTRAINT ocr_documentos_pkey PRIMARY KEY (id);


--
-- Name: registro_expedientes registro_expedientes_numero_expediente_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_expedientes
    ADD CONSTRAINT registro_expedientes_numero_expediente_key UNIQUE (numero_expediente);


--
-- Name: registro_expedientes registro_expedientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_expedientes
    ADD CONSTRAINT registro_expedientes_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: idx_ocr_documentos_exp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ocr_documentos_exp ON public.ocr_documentos USING btree (numero_expediente, documento_index);


--
-- Name: idx_ocr_documentos_sha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ocr_documentos_sha ON public.ocr_documentos USING btree (sha256, modo_ocr);


--
-- Name: registro_expedientes_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registro_expedientes_embedding_idx ON public.registro_expedientes USING hnsw (embedding public.vector_cosine_ops);


--
-- PostgreSQL database dump complete
--

\unrestrict 3DeIg5n7R3lWJqk5j6xaSSCrmJsMwKKUZnbbjqNE4ftZoPWgY1Ir0aOGXwliJk9

