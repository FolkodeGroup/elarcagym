--
-- PostgreSQL database dump
--

\restrict BUPwLXeGGeGCpkAUU9nwhvdQhggaVpmDVZ7UHU5CBkuKThYEVEQwDKJ7oxDSeCe

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: BiometricLog; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."BiometricLog" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    weight double precision NOT NULL,
    height double precision NOT NULL,
    "bodyFat" double precision,
    chest double precision,
    waist double precision,
    hips double precision,
    "memberId" text NOT NULL
);


ALTER TABLE public."BiometricLog" OWNER TO elarcagym_user;

--
-- Name: Diet; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Diet" (
    id text NOT NULL,
    name text NOT NULL,
    calories integer NOT NULL,
    description text NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "memberId" text NOT NULL
);


ALTER TABLE public."Diet" OWNER TO elarcagym_user;

--
-- Name: ExerciseDetail; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."ExerciseDetail" (
    id text NOT NULL,
    name text NOT NULL,
    series text NOT NULL,
    reps text NOT NULL,
    weight text NOT NULL,
    notes text,
    "routineDayId" text NOT NULL
);


ALTER TABLE public."ExerciseDetail" OWNER TO elarcagym_user;

--
-- Name: ExerciseMaster; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."ExerciseMaster" (
    id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL
);


ALTER TABLE public."ExerciseMaster" OWNER TO elarcagym_user;

--
-- Name: HabitualSchedule; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."HabitualSchedule" (
    id text NOT NULL,
    day text NOT NULL,
    start text NOT NULL,
    "end" text NOT NULL,
    "memberId" text NOT NULL
);


ALTER TABLE public."HabitualSchedule" OWNER TO elarcagym_user;

--
-- Name: Member; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Member" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    dni text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "joinDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    "photoUrl" text,
    phase text NOT NULL,
    password text NOT NULL
);


ALTER TABLE public."Member" OWNER TO elarcagym_user;

--
-- Name: PaymentLog; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."PaymentLog" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount double precision NOT NULL,
    concept text NOT NULL,
    method text NOT NULL,
    "memberId" text NOT NULL
);


ALTER TABLE public."PaymentLog" OWNER TO elarcagym_user;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    price double precision NOT NULL,
    category text NOT NULL,
    stock integer NOT NULL
);


ALTER TABLE public."Product" OWNER TO elarcagym_user;

--
-- Name: Reminder; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Reminder" (
    id text NOT NULL,
    text text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    priority text NOT NULL
);


ALTER TABLE public."Reminder" OWNER TO elarcagym_user;

--
-- Name: Reservation; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Reservation" (
    id text NOT NULL,
    "slotId" text NOT NULL,
    "memberId" text,
    "clientName" text NOT NULL,
    "clientPhone" text,
    "clientEmail" text,
    notes text,
    attended boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Reservation" OWNER TO elarcagym_user;

--
-- Name: Routine; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Routine" (
    id text NOT NULL,
    name text NOT NULL,
    goal text NOT NULL,
    "assignedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "memberId" text NOT NULL
);


ALTER TABLE public."Routine" OWNER TO elarcagym_user;

--
-- Name: RoutineDay; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."RoutineDay" (
    id text NOT NULL,
    "dayName" text NOT NULL,
    "routineId" text NOT NULL
);


ALTER TABLE public."RoutineDay" OWNER TO elarcagym_user;

--
-- Name: Sale; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Sale" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total double precision NOT NULL,
    "memberId" text
);


ALTER TABLE public."Sale" OWNER TO elarcagym_user;

--
-- Name: SaleItem; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."SaleItem" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "saleId" text NOT NULL,
    quantity integer NOT NULL,
    "priceAtSale" double precision NOT NULL
);


ALTER TABLE public."SaleItem" OWNER TO elarcagym_user;

--
-- Name: Slot; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public."Slot" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "time" text NOT NULL,
    duration integer NOT NULL,
    status text NOT NULL
);


ALTER TABLE public."Slot" OWNER TO elarcagym_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: elarcagym_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO elarcagym_user;

--
-- Data for Name: BiometricLog; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."BiometricLog" (id, date, weight, height, "bodyFat", chest, waist, hips, "memberId") FROM stdin;
\.


--
-- Data for Name: Diet; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Diet" (id, name, calories, description, "generatedAt", "memberId") FROM stdin;
\.


--
-- Data for Name: ExerciseDetail; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."ExerciseDetail" (id, name, series, reps, weight, notes, "routineDayId") FROM stdin;
\.


--
-- Data for Name: ExerciseMaster; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."ExerciseMaster" (id, name, category) FROM stdin;
\.


--
-- Data for Name: HabitualSchedule; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."HabitualSchedule" (id, day, start, "end", "memberId") FROM stdin;
\.


--
-- Data for Name: Member; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Member" (id, "firstName", "lastName", dni, email, phone, "joinDate", status, "photoUrl", phase, password) FROM stdin;
\.


--
-- Data for Name: PaymentLog; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."PaymentLog" (id, date, amount, concept, method, "memberId") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Product" (id, name, price, category, stock) FROM stdin;
\.


--
-- Data for Name: Reminder; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Reminder" (id, text, date, priority) FROM stdin;
\.


--
-- Data for Name: Reservation; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Reservation" (id, "slotId", "memberId", "clientName", "clientPhone", "clientEmail", notes, attended, "createdAt") FROM stdin;
\.


--
-- Data for Name: Routine; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Routine" (id, name, goal, "assignedBy", "createdAt", "memberId") FROM stdin;
\.


--
-- Data for Name: RoutineDay; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."RoutineDay" (id, "dayName", "routineId") FROM stdin;
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Sale" (id, date, total, "memberId") FROM stdin;
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."SaleItem" (id, "productId", "saleId", quantity, "priceAtSale") FROM stdin;
\.


--
-- Data for Name: Slot; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public."Slot" (id, date, "time", duration, status) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: elarcagym_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
20475a89-0ef4-4d67-bbb9-ce10175c6590	15f7a9b31c3abaf27d4b94efc9f954af36050939648280fefb9d021b48034ca1	2026-01-22 18:11:15.440158-03	20260122211115_init	\N	\N	2026-01-22 18:11:15.35577-03	1
9f23fbda-4a03-4137-ac7e-db7af111a338	42b66fc743221d8ff6ad4d66691b02b0b7fa5766cabbffc20f1f0f172dd0c101	2026-01-22 19:46:47.898303-03	20260122224647_add_member_password	\N	\N	2026-01-22 19:46:47.886487-03	1
\.


--
-- Name: BiometricLog BiometricLog_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."BiometricLog"
    ADD CONSTRAINT "BiometricLog_pkey" PRIMARY KEY (id);


--
-- Name: Diet Diet_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Diet"
    ADD CONSTRAINT "Diet_pkey" PRIMARY KEY (id);


--
-- Name: ExerciseDetail ExerciseDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."ExerciseDetail"
    ADD CONSTRAINT "ExerciseDetail_pkey" PRIMARY KEY (id);


--
-- Name: ExerciseMaster ExerciseMaster_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."ExerciseMaster"
    ADD CONSTRAINT "ExerciseMaster_pkey" PRIMARY KEY (id);


--
-- Name: HabitualSchedule HabitualSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."HabitualSchedule"
    ADD CONSTRAINT "HabitualSchedule_pkey" PRIMARY KEY (id);


--
-- Name: Member Member_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_pkey" PRIMARY KEY (id);


--
-- Name: PaymentLog PaymentLog_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."PaymentLog"
    ADD CONSTRAINT "PaymentLog_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Reminder Reminder_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY (id);


--
-- Name: Reservation Reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_pkey" PRIMARY KEY (id);


--
-- Name: RoutineDay RoutineDay_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."RoutineDay"
    ADD CONSTRAINT "RoutineDay_pkey" PRIMARY KEY (id);


--
-- Name: Routine Routine_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Routine"
    ADD CONSTRAINT "Routine_pkey" PRIMARY KEY (id);


--
-- Name: SaleItem SaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: Slot Slot_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Slot"
    ADD CONSTRAINT "Slot_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Member_dni_key; Type: INDEX; Schema: public; Owner: elarcagym_user
--

CREATE UNIQUE INDEX "Member_dni_key" ON public."Member" USING btree (dni);


--
-- Name: Member_email_key; Type: INDEX; Schema: public; Owner: elarcagym_user
--

CREATE UNIQUE INDEX "Member_email_key" ON public."Member" USING btree (email);


--
-- Name: BiometricLog BiometricLog_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."BiometricLog"
    ADD CONSTRAINT "BiometricLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Diet Diet_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Diet"
    ADD CONSTRAINT "Diet_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExerciseDetail ExerciseDetail_routineDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."ExerciseDetail"
    ADD CONSTRAINT "ExerciseDetail_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES public."RoutineDay"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HabitualSchedule HabitualSchedule_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."HabitualSchedule"
    ADD CONSTRAINT "HabitualSchedule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaymentLog PaymentLog_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."PaymentLog"
    ADD CONSTRAINT "PaymentLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reservation Reservation_slotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES public."Slot"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoutineDay RoutineDay_routineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."RoutineDay"
    ADD CONSTRAINT "RoutineDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES public."Routine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Routine Routine_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Routine"
    ADD CONSTRAINT "Routine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elarcagym_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict BUPwLXeGGeGCpkAUU9nwhvdQhggaVpmDVZ7UHU5CBkuKThYEVEQwDKJ7oxDSeCe

