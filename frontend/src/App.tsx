import { PRIMARY_DOCTOR, type AppointmentStatus, type AppointmentSummary, type ConsultationSummary, type PatientDetails, type PatientSummary, type PublicBusyPeriod, type StructuredMedicalNote, type UserRole } from "@medcabinet/shared";
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ClipboardPlus,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  MapPin,
  Mic,
  Search,
  ShieldCheck,
  SmilePlus,
  Sparkles,
  Square,
  Trash2,
  UserRoundPlus,
  Users,
  X
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import { FormEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const savedTokenKey = "firassayari-token";
const savedUserKey = "firassayari-user";
const appointmentTimes = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"];

type SessionUser = {
  email: string;
  role: UserRole;
  fullName: string;
  displayName: string;
};

type FinanceSummary = {
  revenueCents: number;
  unpaidCents: number;
  invoices: number;
  payments: { cashCents: number; cardCents: number };
};

type Reminder = { id: string; channel: string; target: string; status: string; message: string };
type PlatformStats = { clinics: number; activeSubscriptions: number; doctors: number; monthlyRecurringRevenueCents: number; auditEvents24h: number };
type InvoicePreview = { number: string; patientName: string; amountCents: number; pdfStatus: string };
type FinanceActivity = { id: string; number: string; patientName: string; amountCents: number; paidAt: string | null; paymentMethod: string | null; createdAt: string };
type RevenueRange = "24h" | "7d" | "30d" | "month";
type RevenueBucket = { label: string; start: string; end: string; paidCents: number; unpaidCents: number; cashCents: number; invoices: number };
type RevenueSeries = { range: RevenueRange; from: string; to: string; buckets: RevenueBucket[] };
type OrdonnanceSummary = { id: string; patientId: string; patientName: string; doctorName: string; doctorShortName: string; content: string; imageDataUrl: string; createdAt: string };
type AdminPage = "dashboard" | "agenda" | "patients" | "consultations" | "ordonnance" | "finance";
type SpeechStatus = "idle" | "listening" | "unsupported" | "error";

type RecognitionResult = {
  isFinal: boolean;
  0?: { transcript: string };
};

type RecognitionEvent = {
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start: (audioTrack?: MediaStreamTrack) => void;
  stop: () => void;
};

type SpeechEnabledWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

const adminPages: Array<{ page: AdminPage; href: string; label: string; icon: ReactNode }> = [
  { page: "dashboard", href: "/admin", label: "Tableau", icon: <Activity /> },
  { page: "agenda", href: "/admin/agenda", label: "Agenda", icon: <CalendarCheck /> },
  { page: "patients", href: "/admin/patients", label: "Patients", icon: <Users /> },
  { page: "consultations", href: "/admin/consultations", label: "Consultations", icon: <FileText /> },
  { page: "ordonnance", href: "/admin/ordonnance", label: "Ordonnance", icon: <ClipboardPlus /> },
  { page: "finance", href: "/admin/finance", label: "Finances", icon: <CreditCard /> }
];

export function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminDashboard /> : <PatientLanding />;
}

function PatientLanding() {
  const [form, setForm] = useState({
    patientName: "",
    phone: "",
    date: tomorrowDate(),
    time: "09:00",
    reason: ""
  });
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [busyPeriods, setBusyPeriods] = useState<PublicBusyPeriod[]>([]);
  const [availabilityState, setAvailabilityState] = useState<"loading" | "ready" | "error">("loading");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const from = new Date(`${form.date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    setAvailabilityState("loading");

    const loadAvailability = () => api<PublicBusyPeriod[]>(`/api/appointments/availability?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then((periods) => {
        if (!active) return;
        setBusyPeriods(periods);
        setAvailabilityState("ready");
      })
      .catch(() => {
        if (!active) return;
        setBusyPeriods([]);
        setAvailabilityState("error");
      });

    void loadAvailability();
    const interval = window.setInterval(() => void loadAvailability(), 15_000);
    const onFocus = () => void loadAvailability();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [availabilityVersion, form.date]);

  const appointmentSlots = useMemo(() => appointmentTimes.map((time) => {
    const startsAt = new Date(`${form.date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
    return {
      time,
      available: !busyPeriods.some((period) => new Date(period.startsAt) < endsAt && new Date(period.endsAt) > startsAt)
    };
  }), [busyPeriods, form.date]);
  const selectedSlot = appointmentSlots.find((slot) => slot.time === form.time);

  useEffect(() => {
    if (availabilityState !== "ready" || selectedSlot?.available) return;
    const firstAvailable = appointmentSlots.find((slot) => slot.available);
    if (firstAvailable) setForm((current) => ({ ...current, time: firstAvailable.time }));
  }, [appointmentSlots, availabilityState, selectedSlot?.available]);

  async function requestAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (availabilityState !== "ready" || !selectedSlot?.available) {
      setRequestState("error");
      setMessage("Veuillez selectionner un creneau disponible.");
      return;
    }
    setRequestState("sending");
    setMessage("");
    const startsAt = new Date(`${form.date}T${form.time}`);
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000);

    try {
      await api("/api/appointments/requests", {
        method: "POST",
        body: JSON.stringify({
          patientName: form.patientName,
          phone: form.phone,
          reason: form.reason,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString()
        })
      });
      setRequestState("sent");
      setMessage("Votre demande est enregistree. Le cabinet dentaire confirmera le rendez-vous.");
      setBusyPeriods((current) => [...current, { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }]);
      setForm((current) => ({ ...current, patientName: "", phone: "" }));
      setAvailabilityVersion((value) => value + 1);
    } catch (error) {
      setRequestState("error");
      setMessage(readError(error));
    }
  }

  return (
    <main className="site">
      <header className="public-nav">
        <div className="nav-shell">
          <a className="doctor-mark" href="/" aria-label="Accueil Dr Firas Sayari">
            <BrandLogo />
            <strong>Dr Firas Sayari<small>Dentiste</small></strong>
          </a>
          <nav aria-label="Navigation publique">
            <a href="#soins">Soins</a>
            <a href="#cabinet">Cabinet</a>
            <a href="#localisation">Localisation</a>
            <a href="#rdv" className="appointment-link"><CalendarCheck /> Prendre rendez-vous</a>
            <a className="nav-command" href="/admin"><ShieldCheck /> Admin</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <p className="eyebrow">Cabinet dentaire | Dr Firas Sayari</p>
            <h1>Votre sourire merite des soins de confiance.</h1>
            <p className="hero-lead">Des soins dentaires precis et attentifs, dans un cabinet moderne ou chaque traitement est explique simplement.</p>
            <div className="hero-actions">
              <a href="#rdv"><CalendarCheck /> Reserver une visite</a>
              <a href="#soins" className="quiet-action">Voir nos soins <ArrowRight /></a>
            </div>
            <div className="hero-points" aria-label="Engagements du cabinet">
              <span><ShieldCheck /> Hygiene rigoureuse</span>
              <span><Clock3 /> Creneaux rapides</span>
              <span><SmilePlus /> Suivi personnalise</span>
            </div>
          </div>
          <figure className="hero-visual">
            <img src="/images/hero2.png" alt="Dr Firas Sayari dans son cabinet dentaire moderne" />
            <figcaption>
              <Sparkles />
              <span><strong>Cabinet moderne</strong>Des soins sereins et soigneusement planifies.</span>
            </figcaption>
          </figure>
        </div>
        <div className="confidence-bar" aria-label="Services principaux">
          <article><strong>Bilan complet</strong><span>Prevention et conseils</span></article>
          <article><strong>Soins conservateurs</strong><span>Confort et precision</span></article>
          <article><strong>Urgences dentaires</strong><span>Demande de creneau rapide</span></article>
        </div>
      </section>

      <section id="rdv" className="booking-section">
        <div className="booking-intro">
          <p className="eyebrow">Prendre rendez-vous</p>
          <h2>Planifiez votre consultation en quelques instants.</h2>
          <p>Indiquez le soin recherche et le creneau souhaite. Le cabinet vous contacte pour confirmer votre visite.</p>
          <div className="booking-note">
            <Clock3 />
            <span><strong>Consultations sur rendez-vous</strong>Choisissez un creneau disponible du lundi au vendredi.</span>
          </div>
        </div>

        <div className="booking-workspace">
          <form className="booking-tool" onSubmit={requestAppointment}>
            <div>
              <p>Rendez-vous dentaire</p>
              <strong>Vos informations</strong>
            </div>
            <div className="booking-pair">
              <label>
                Nom complet
                <input required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} placeholder="Votre nom" />
              </label>
              <label>
                Telephone
                <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="12 345 678" />
              </label>
            </div>
            <label className="booking-reason">
              Decrivez ce que vous souhaitez
              <textarea required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Ex: controle, douleur, detartrage, soin dentaire..." />
            </label>
            <label>
              Date souhaitee
              <input required type="date" value={form.date} min={tomorrowDate()} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
            <div className="selected-appointment">
              <CalendarCheck />
              <span><small>Creneau selectionne</small><strong>{readableDate(form.date)} a {form.time}</strong></span>
            </div>
            <button disabled={requestState === "sending" || availabilityState !== "ready" || !selectedSlot?.available}><ClipboardPlus /> {requestState === "sending" ? "Envoi..." : "Prendre un rendez-vous"}</button>
            {message ? <output className={requestState}>{message}</output> : null}
          </form>

          <aside className="availability-board" aria-live="polite">
            <header>
              <p className="eyebrow">Agenda disponible</p>
              <h3>{readableDate(form.date)}</h3>
              <span>Creneaux de 30 minutes</span>
            </header>
            {availabilityState === "error" ? <p className="availability-error">Impossible de charger les disponibilites pour le moment.</p> : (
              <div className="slot-grid" aria-label="Creneaux disponibles">
                {appointmentSlots.map((slot) => (
                  <button
                    className={`${slot.available ? "available" : "busy"} ${form.time === slot.time ? "selected" : ""}`}
                    disabled={availabilityState === "loading" || !slot.available}
                    key={slot.time}
                    onClick={() => setForm({ ...form, time: slot.time })}
                    type="button"
                  >
                    <strong>{slot.time}</strong>
                    <small>{availabilityState === "loading" ? "..." : slot.available ? "Disponible" : "Occupe"}</small>
                  </button>
                ))}
              </div>
            )}
            <p className="availability-legend"><i /> Disponible <i className="occupied" /> Occupe</p>
          </aside>
        </div>
      </section>

      <section id="soins" className="cabinet-band">
        <div className="section-heading">
          <p className="eyebrow">Nos soins</p>
          <h2>Des solutions pour proteger et valoriser votre sourire.</h2>
          <p className="band-intro">Une approche douce, de la prevention au soulagement d'une douleur dentaire.</p>
        </div>
        <div className="service-cards">
          <Feature icon={<SmilePlus />} title="Bilan & prevention" text="Controle dentaire, conseils personnalises et detartrage pour preserver votre sourire." />
          <Feature icon={<Sparkles />} title="Soins du sourire" text="Traitement des caries et solutions esthetiques discutees avec clarte." />
          <Feature icon={<CalendarCheck />} title="Douleur & urgence" text="Demandez rapidement un creneau en cas de douleur ou d'inconfort dentaire." />
        </div>
      </section>

      <section id="cabinet" className="patient-path">
        <div className="path-copy">
          <p className="eyebrow">Le cabinet</p>
          <h2>Votre visite, simplement organisee.</h2>
          <p>Une prise en charge dentaire attentive dans un espace moderne, avec un suivi centralise par l'equipe.</p>
        </div>
        <div className="path-steps">
          <article><b>01</b><strong>Demandez</strong><span>Choisissez un motif et un creneau en ligne.</span></article>
          <article><b>02</b><strong>Confirmez</strong><span>Le cabinet valide votre rendez-vous.</span></article>
          <article><b>03</b><strong>Souriez</strong><span>Recevez des soins adaptes et expliques.</span></article>
        </div>
      </section>

      <section id="localisation" className="location-section">
        <div className="location-copy">
          <p className="eyebrow">Nous trouver</p>
          <h2>Le cabinet au coeur de Menzel Temime.</h2>
          <p>Retrouvez le cabinet du Dr Firas Sayari et preparez facilement votre trajet avant votre rendez-vous.</p>
          <address className="location-address">
            <MapPin />
            <span>
              <strong>Dr Firas Sayari - Dentiste</strong>
              Avenue Habib Bourguiba<br />
              Menzel Temime 8080, Tunisie
            </span>
          </address>
          <a
            className="location-link"
            href="https://share.google/WlPP5BckJKMfVinDj"
            rel="noreferrer"
            target="_blank"
          >
            <MapPin /> Ouvrir l'itineraire
          </a>
        </div>
        <div className="location-map">
          <iframe
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=10.9864%2C36.7767%2C10.9999%2C36.7850&amp;layer=mapnik&amp;marker=36.7808512%2C10.9931998"
            title="Localisation du cabinet Dr Firas Sayari"
          />
        </div>
      </section>
    </main>
  );
}

function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(savedTokenKey) ?? "");
  const [user, setUser] = useState<SessionUser | null>(() => parseUser(localStorage.getItem(savedUserKey)));

  function storeSession(nextToken: string, nextUser: SessionUser) {
    localStorage.setItem(savedTokenKey, nextToken);
    localStorage.setItem(savedUserKey, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem(savedTokenKey);
    localStorage.removeItem(savedUserKey);
    setToken("");
    setUser(null);
  }

  if (!token || !user) return <AdminLogin onLogin={storeSession} />;
  return <AdminWorkspace token={token} user={user} onLogout={logout} />;
}

function AdminLogin({ onLogin }: { onLogin: (token: string, user: SessionUser) => void }) {
  const [email, setEmail] = useState("firas@medcabinet.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ accessToken: string; user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onLogin(result.accessToken, result.user);
    } catch (caught) {
      setError(readError(caught));
    }
  }

  return (
    <main className="admin-login">
      <a className="doctor-mark" href="/"><BrandLogo /><strong>Dr Firas Sayari<small>Dentiste</small></strong></a>
      <form onSubmit={login}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Accès cabinet</h1>
        </div>
        <label>Email<input autoComplete="username" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Mot de passe<input autoComplete="current-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button><LogIn /> Connexion</button>
        {error ? <output className="error">{error}</output> : null}
      </form>
    </main>
  );
}

function AdminWorkspace({ token, user, onLogout }: { token: string; user: SessionUser; onLogout: () => void }) {
  const [page, setPage] = useState<AdminPage>(() => currentAdminPage());
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [financeActivity, setFinanceActivity] = useState<FinanceActivity[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<RevenueSeries | null>(null);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>("7d");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [platform, setPlatform] = useState<PlatformStats | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [appointmentsRefreshId, setAppointmentsRefreshId] = useState(0);
  const [patientsRefreshId, setPatientsRefreshId] = useState(0);
  const [financeRefreshId, setFinanceRefreshId] = useState(0);
  const [remindersRefreshId, setRemindersRefreshId] = useState(0);
  const fetchedAppointmentsVersion = useRef(-1);
  const fetchedPatientsKey = useRef("");
  const fetchedFinanceVersion = useRef(-1);
  const fetchedFinanceActivityVersion = useRef(-1);
  const fetchedRevenueSeriesKey = useRef("");
  const fetchedRemindersVersion = useRef(-1);
  const fetchedPlatform = useRef(false);

  useEffect(() => {
    const updatePage = () => setPage(currentAdminPage());
    window.addEventListener("popstate", updatePage);
    return () => window.removeEventListener("popstate", updatePage);
  }, []);

  useEffect(() => {
    if (page !== "dashboard" && page !== "agenda" && page !== "consultations") return;
    let active = true;
    const loadAppointments = () => {
      if (fetchedAppointmentsVersion.current === appointmentsRefreshId) return;
      fetchedAppointmentsVersion.current = appointmentsRefreshId;
      api<AppointmentSummary[]>("/api/appointments", auth(token))
        .then((nextAppointments) => {
          if (active) setAppointments(nextAppointments);
        })
        .catch((error) => {
          if (active) setNotice(readError(error));
        });
    };
    const refreshAppointments = () => {
      fetchedAppointmentsVersion.current = -1;
      loadAppointments();
    };

    loadAppointments();
    const interval = window.setInterval(refreshAppointments, 15_000);
    const onFocus = () => refreshAppointments();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [appointmentsRefreshId, page, token]);

  useEffect(() => {
    if (page !== "dashboard" && page !== "patients" && page !== "consultations" && page !== "ordonnance") return;
    const searchQuery = page === "patients" ? search.trim() : "";
    const key = `${patientsRefreshId}:${searchQuery}`;
    if (fetchedPatientsKey.current === key) return;

    const timeout = window.setTimeout(() => {
      fetchedPatientsKey.current = key;
      api<PatientSummary[]>(`/api/patients${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""}`, auth(token))
        .then(setPatients)
        .catch((error) => setNotice(readError(error)));
    }, page === "patients" ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [page, patientsRefreshId, search, token]);

  useEffect(() => {
    if (page !== "dashboard" && page !== "finance") return;
    if (fetchedFinanceVersion.current === financeRefreshId) return;
    fetchedFinanceVersion.current = financeRefreshId;
    api<FinanceSummary>("/api/finance/monthly-summary", auth(token))
      .then(setFinance)
      .catch((error) => setNotice(readError(error)));
  }, [financeRefreshId, page, token]);

  useEffect(() => {
    if (page !== "finance") return;
    if (fetchedFinanceActivityVersion.current === financeRefreshId) return;
    fetchedFinanceActivityVersion.current = financeRefreshId;
    api<FinanceActivity[]>("/api/finance/activity", auth(token))
      .then(setFinanceActivity)
      .catch((error) => setNotice(readError(error)));
  }, [financeRefreshId, page, token]);

  useEffect(() => {
    if (page !== "finance") return;
    const key = `${financeRefreshId}:${revenueRange}`;
    if (fetchedRevenueSeriesKey.current === key) return;
    fetchedRevenueSeriesKey.current = key;
    api<RevenueSeries>(`/api/finance/revenue-series?range=${revenueRange}`, auth(token))
      .then(setRevenueSeries)
      .catch((error) => setNotice(readError(error)));
  }, [financeRefreshId, page, revenueRange, token]);

  useEffect(() => {
    if (page !== "dashboard" && page !== "finance") return;
    if (fetchedRemindersVersion.current === remindersRefreshId) return;
    fetchedRemindersVersion.current = remindersRefreshId;
    api<Reminder[]>("/api/notifications/reminders", auth(token))
      .then(setReminders)
      .catch((error) => setNotice(readError(error)));
  }, [page, remindersRefreshId, token]);

  useEffect(() => {
    if (user.role !== "SAAS_ADMIN" || (page !== "dashboard" && page !== "finance") || fetchedPlatform.current) return;
    fetchedPlatform.current = true;
    api<PlatformStats>("/api/admin/platform-stats", auth(token)).then(setPlatform).catch((error) => setNotice(readError(error)));
  }, [page, token, user.role]);

  const pending = appointments.filter((appointment) => appointment.status === "PENDING").length;
  const title = adminPages.find((route) => route.page === page)?.label ?? "Tableau";
  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  function openPage(event: MouseEvent<HTMLAnchorElement>, route: { page: AdminPage; href: string }) {
    event.preventDefault();
    window.history.pushState({}, "", route.href);
    setPage(route.page);
  }

  function refreshAppointments() {
    setAppointmentsRefreshId((value) => value + 1);
    setFinanceRefreshId((value) => value + 1);
  }

  return (
    <main className="admin-shell">
      <aside>
        <a className="doctor-mark" href="/"><BrandLogo /><strong>Dr Firas Sayari<small>Dentiste</small></strong></a>
        <nav aria-label="Administration">
          {adminPages.map((route) => (
            <a key={route.page} className={page === route.page ? "active" : undefined} href={route.href} onClick={(event) => openPage(event, route)}>
              {route.icon}
              {route.label}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span>{user.displayName}</span>
          <small>{roleLabel(user.role)}</small>
          <button onClick={onLogout}><LogOut /> Deconnexion</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{roleLabel(user.role)}</p>
            <h1>{title}</h1>
            <span>Bonjour {user.displayName} - {todayLabel}</span>
          </div>
          <div className="workspace-actions">
            {page === "patients" ? <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un patient" /></label> : null}
          </div>
        </header>
        {notice ? <output className="workspace-notice">{notice}</output> : null}
        {page === "dashboard" ? <AdminOverview appointments={appointments} patients={patients} finance={finance} reminders={reminders} platform={platform} pending={pending} onOpenPage={(nextPage) => {
          const route = adminPages.find((item) => item.page === nextPage);
          if (!route) return;
          window.history.pushState({}, "", route.href);
          setPage(route.page);
        }} /> : null}
        {page === "agenda" ? <AgendaPage appointments={appointments} token={token} onChanged={refreshAppointments} /> : null}
        {page === "patients" ? <PatientsPage patients={patients} token={token} onChanged={() => setPatientsRefreshId((value) => value + 1)} /> : null}
        {page === "consultations" ? <ConsultationsPage token={token} patients={patients} appointments={appointments} onChanged={() => setPatientsRefreshId((value) => value + 1)} /> : null}
        {page === "ordonnance" ? <OrdonnancePage patients={patients} token={token} /> : null}
        {page === "finance" ? <FinancePage token={token} finance={finance} activity={financeActivity} revenueSeries={revenueSeries} revenueRange={revenueRange} onRevenueRangeChange={setRevenueRange} reminders={reminders} platform={platform} /> : null}
      </section>
    </main>
  );
}

function AdminOverview({ appointments, patients, finance, reminders, platform, pending, onOpenPage }: { appointments: AppointmentSummary[]; patients: PatientSummary[]; finance: FinanceSummary | null; reminders: Reminder[]; platform: PlatformStats | null; pending: number; onOpenPage: (page: AdminPage) => void }) {
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "PENDING").slice(0, 4);
  const upcoming = useMemo(() => [...appointments].sort((left, right) => left.startsAt.localeCompare(right.startsAt)).slice(0, 5), [appointments]);

  return (
    <div className="admin-page dashboard-page">
      <section className="metrics">
        <Metric icon={<CalendarCheck />} label="Agenda" value={String(appointments.length)} detail={`${pending} à confirmer`} />
        <Metric icon={<Users />} label="Patients" value={String(patients.length)} detail="Dossiers actifs" />
        <Metric icon={<CreditCard />} label="Revenu" value={money(finance?.revenueCents)} detail={`${finance?.invoices ?? 0} facture(s)`} />
        <Metric icon={<BellRing />} label="Rappels" value={String(reminders.length)} detail="Suivi opérationnel" />
      </section>

      <section className="quick-actions" aria-label="Actions rapides">
        <a href="/admin/agenda" onClick={(event) => { event.preventDefault(); onOpenPage("agenda"); }}><CalendarCheck /> Agenda</a>
        <a href="/admin/patients" onClick={(event) => { event.preventDefault(); onOpenPage("patients"); }}><Users /> Patients</a>
        <a href="/admin/consultations" onClick={(event) => { event.preventDefault(); onOpenPage("consultations"); }}><FileText /> Consultation</a>
        <a href="/admin/finance" onClick={(event) => { event.preventDefault(); onOpenPage("finance"); }}><CreditCard /> Finance</a>
      </section>

      <section className="admin-grid dashboard-grid">
        <Panel title="Prochains rendez-vous" subtitle="Aperçu de l'agenda du cabinet.">
          <AppointmentTimeline appointments={upcoming} />
        </Panel>
        <Panel title="Demandes en attente" subtitle="À confirmer avant apparition dans l'agenda.">
          {!pendingAppointments.length ? <p className="empty">Aucune demande à confirmer.</p> : (
            <div className="pending-preview">
              {pendingAppointments.map((appointment) => (
                <article key={appointment.id}>
                  <span><Clock3 /> {appointmentDateTime(appointment)}</span>
                  <strong>{appointment.patientName}</strong>
                  <small>{appointment.reason}</small>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="admin-grid dashboard-grid">
        <OperationsPanel reminders={reminders} platform={platform} />
        <Panel title="Encaissement" subtitle="Résumé rapide du mois.">
          <div className="cash-snapshot">
            <article><span>Encaissé</span><strong>{money(finance?.revenueCents)}</strong></article>
            <article><span>À encaisser</span><strong>{money(finance?.unpaidCents)}</strong></article>
            <article><span>Espèces</span><strong>{money(finance?.payments.cashCents)}</strong></article>
            <article><span>Carte</span><strong>{money(finance?.payments.cardCents)}</strong></article>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function AgendaPage({ appointments, token, onChanged }: { appointments: AppointmentSummary[]; token: string; onChanged: () => void }) {
  const [draftRange, setDraftRange] = useState<{ startsAt: Date; endsAt: Date } | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const calendarRef = useRef<FullCalendar | null>(null);
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const calendarAppointments = appointments.filter((appointment) => appointment.status !== "CANCELLED");

  useEffect(() => {
    if (selectedId && !selectedAppointment) setSelectedId("");
  }, [selectedAppointment, selectedId]);

  async function moveAppointment(info: EventDropArg) {
    if (!info.event.start || !info.event.end) {
      info.revert();
      return;
    }

    try {
      await api(`/api/appointments/${info.event.id}/move`, {
        ...auth(token),
        method: "PATCH",
        body: JSON.stringify({ startsAt: info.event.start.toISOString(), endsAt: info.event.end.toISOString() })
      });
      setMessage("Rendez-vous deplace.");
      onChanged();
    } catch (error) {
      info.revert();
      setMessage(readError(error));
    }
  }

  function createFromSelection(info: DateSelectArg) {
    setDraftRange({ startsAt: info.start, endsAt: info.end });
    setMessage("");
  }

  function selectAppointment(info: EventClickArg) {
    setSelectedId(info.event.id);
  }

  function closeCreateModal() {
    calendarRef.current?.getApi().unselect();
    setDraftRange(null);
  }

  function completeCreateModal() {
    closeCreateModal();
    onChanged();
  }

  return (
    <section className="admin-page agenda-page agenda-full-page">
      <Panel title="Agenda du cabinet" subtitle="Sélectionnez une plage horaire directement dans le calendrier pour ajouter un rendez-vous.">
        <div className="cabinet-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            locale={frLocale}
            initialView="timeGridWeek"
            headerToolbar={{ left: "title", center: "", right: "today prev,next timeGridWeek,timeGridDay" }}
            buttonText={{ today: "Aujourd'hui", week: "Semaine", day: "Jour" }}
            allDaySlot={false}
            nowIndicator
            scrollTime="08:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="00:30:00"
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            selectable
            selectMirror
            unselectAuto={false}
            select={createFromSelection}
            eventClick={selectAppointment}
            eventDrop={moveAppointment}
            editable
            eventOverlap={false}
            eventDurationEditable={false}
            slotEventOverlap={false}
            events={calendarAppointments.map((appointment) => ({
              id: appointment.id,
              title: `${appointment.patientName} - ${statusLabel(appointment.status)}`,
              start: appointment.startsAt,
              end: appointment.endsAt,
              className: `calendar-event ${appointment.status.toLowerCase()}`
            }))}
          />
        </div>
        {message ? <output>{message}</output> : null}
      </Panel>
      {selectedAppointment ? <PatientRecordModal appointment={selectedAppointment} patientId={selectedAppointment.patientId} token={token} onClose={() => setSelectedId("")} onChanged={onChanged} /> : null}
      {draftRange ? <AgendaCreateModal range={draftRange} token={token} onClose={closeCreateModal} onCreated={completeCreateModal} /> : null}
    </section>
  );
}

function AgendaCreateModal({ range, token, onClose, onCreated }: { range: { startsAt: Date; endsAt: Date }; token: string; onClose: () => void; onCreated: () => void }) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Consultation");
  const [paidAmount, setPaidAmount] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = patientQuery.trim();
    setSelectedPatient((current) => current && `${current.firstName} ${current.lastName}`.trim() === query ? current : null);
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      api<PatientSummary[]>(`/api/patients?search=${encodeURIComponent(query)}`, auth(token))
        .then((results) => setPatientResults(results.slice(0, 5)))
        .catch((error) => setMessage(readError(error)));
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [patientQuery, token]);

  function pickPatient(patient: PatientSummary) {
    setSelectedPatient(patient);
    setPatientQuery(`${patient.firstName} ${patient.lastName}`.trim());
    setPhone(patient.phone);
    setPatientResults([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const patientName = patientQuery.trim();
    if (!patientName) {
      setMessage("Indiquez le nom du patient.");
      return;
    }

    try {
      let patientId = selectedPatient?.id;
      if (!patientId) {
        const name = splitDisplayName(patientName);
        const patient = await api<PatientSummary>("/api/patients", {
          ...auth(token),
          method: "POST",
          body: JSON.stringify({
            firstName: name.firstName,
            lastName: name.lastName,
            phone,
            email: "",
            address: "",
            medicalHistory: "",
            allergies: [],
            chronicConditions: []
          })
        });
        patientId = patient.id;
      }

      await api("/api/appointments", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({
          patientId,
          patientName,
          startsAt: range.startsAt.toISOString(),
          endsAt: range.endsAt.toISOString(),
          status: "CONFIRMED",
          reason,
          paidAmountCents: paidAmount.trim() ? Math.round(Number(paidAmount) * 100) : undefined
        })
      });
      onCreated();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="agenda-create-modal" aria-label="Ajouter un rendez-vous" aria-modal="true" role="dialog">
        <header>
          <div>
            <p className="eyebrow">Nouveau rendez-vous</p>
            <h2>{formatDateTime(range.startsAt.toISOString())} - {range.endsAt.toLocaleTimeString("fr-FR", { timeStyle: "short" })}</h2>
          </div>
          <button className="close-command" type="button" onClick={onClose} aria-label="Fermer"><X /></button>
        </header>
        <form className="stack-form" onSubmit={submit}>
          <label className="patient-search-field">
            Nom et prénom
            <input required value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Commencez à taper le nom" />
            {patientResults.length ? (
              <div className="patient-search-results">
                {patientResults.map((patient) => (
                  <button key={patient.id} type="button" onClick={() => pickPatient(patient)}>
                    <strong>{patient.firstName} {patient.lastName}</strong>
                    <span>{patient.phone || "Téléphone non renseigné"}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <div className="form-pair">
            <label>
              Téléphone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="12 345 678" />
            </label>
            <label>
              Prix payé
              <input inputMode="decimal" min="0" type="number" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder="Optionnel" />
            </label>
          </div>
          <label>
            Consultation / opération
            <textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Consultation, opération, soin, contrôle..." />
          </label>
          <button><CalendarCheck /> Ajouter le rendez-vous</button>
          {message ? <output className="error">{message}</output> : null}
        </form>
      </section>
    </div>
  );
}

function PendingAppointments({ appointments, token, onChanged, onOpen }: { appointments: AppointmentSummary[]; token: string; onChanged: () => void; onOpen: (id: string) => void }) {
  const [message, setMessage] = useState("");

  async function updateStatus(appointment: AppointmentSummary, status: AppointmentStatus) {
    try {
      await api(`/api/appointments/${appointment.id}/status`, { ...auth(token), method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(status === "CONFIRMED" ? "Rendez-vous confirmé. Encaissement de 40 TND ajouté." : "Demande annulée.");
      onChanged();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return (
    <Panel title="Demandes à confirmer" subtitle="Les demandes du site apparaissent dans l'agenda après confirmation.">
      {!appointments.length ? <p className="empty">Aucune demande en attente.</p> : (
        <div className="request-list">
          {appointments.map((appointment) => (
            <article key={appointment.id}>
              <button className="patient-command" type="button" onClick={() => onOpen(appointment.id)}>
                <strong>{appointment.patientName}</strong>
                <time>{appointmentDateTime(appointment)}</time>
                <span>{appointment.reason}</span>
              </button>
              <div className="inline-actions">
                <button type="button" onClick={() => void updateStatus(appointment, "CONFIRMED")}><CheckCircle2 /> Confirmer</button>
                <button className="quiet-command" type="button" onClick={() => void updateStatus(appointment, "CANCELLED")}><X /> Refuser</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {message ? <output>{message}</output> : null}
    </Panel>
  );
}

function PatientRecordModal({ patientId, appointment, token, onClose, onChanged }: { patientId: string; appointment?: AppointmentSummary; token: string; onClose: () => void; onChanged: () => void }) {
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [activeAppointment, setActiveAppointment] = useState(appointment ?? null);
  const [confirmPrice, setConfirmPrice] = useState("");
  const [message, setMessage] = useState("");
  const [reloadId, setReloadId] = useState(0);

  useEffect(() => setActiveAppointment(appointment ?? null), [appointment]);

  useEffect(() => {
    setDetails(null);
    api<PatientDetails>(`/api/patients/${patientId}`, auth(token))
      .then(setDetails)
      .catch((error) => setMessage(readError(error)));
  }, [patientId, reloadId, token]);

  async function updateStatus(status: AppointmentStatus) {
    if (!activeAppointment) return;
    try {
      const paidAmountCents = status === "CONFIRMED" && confirmPrice.trim() ? Math.round(Number(confirmPrice) * 100) : undefined;
      const updated = await api<AppointmentSummary>(`/api/appointments/${activeAppointment.id}/status`, {
        ...auth(token),
        method: "PATCH",
        body: JSON.stringify({ status, paidAmountCents })
      });
      setActiveAppointment(updated);
      setConfirmPrice("");
      setMessage(status === "CONFIRMED" ? (paidAmountCents == null ? "Rendez-vous confirmé sans encaissement." : `Confirmé : +${money(paidAmountCents)} encaissés.`) : `Statut modifié : ${statusLabel(status)}.`);
      setReloadId((value) => value + 1);
      onChanged();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  async function removeAppointment() {
    if (!activeAppointment) return;
    try {
      await api(`/api/appointments/${activeAppointment.id}`, { ...auth(token), method: "DELETE" });
      onChanged();
      onClose();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="patient-modal" aria-label="Dossier détaillé du patient" aria-modal="true" role="dialog">
        <header>
          <div>
            <p className="eyebrow">Dossier patient</p>
            <h2>{details ? `${details.firstName} ${details.lastName}` : "Chargement..."}</h2>
          </div>
          <button className="close-command" type="button" onClick={onClose} aria-label="Fermer"><X /></button>
        </header>
        {!details ? <p className="empty">Chargement du dossier...</p> : (
          <div className="patient-record">
            <section className="identity-card">
              <strong>Coordonnées et santé</strong>
              <span>Téléphone : {details.phone || "Non renseigné"}</span>
              <span>Email : {details.email || "Non renseigné"}</span>
              <span>Adresse : {details.address || "Non renseignée"}</span>
              <span>Allergies : {details.allergies.join(", ") || "Aucune signalée"}</span>
              <span>Pathologies : {details.chronicConditions.join(", ") || "Aucune signalée"}</span>
              <span>Antécédents : {details.medicalHistory || "Non renseignés"}</span>
            </section>
            {activeAppointment ? (
              <section className="selected-visit">
                <div>
                  <strong>Rendez-vous sélectionné</strong>
                  <time>{appointmentDateTime(activeAppointment)}</time>
                  <span>{activeAppointment.reason}</span>
                </div>
                <Status value={activeAppointment.status} />
                <div className="inline-actions">
                  {activeAppointment.status === "PENDING" ? (
                    <label className="confirm-price-field">
                      Prix payé
                      <input inputMode="decimal" min="0" type="number" value={confirmPrice} onChange={(event) => setConfirmPrice(event.target.value)} placeholder="Optionnel" />
                    </label>
                  ) : null}
                  {activeAppointment.status === "PENDING" ? <button type="button" onClick={() => void updateStatus("CONFIRMED")}><CheckCircle2 /> Confirmer</button> : null}
                  {activeAppointment.status === "CONFIRMED" ? <button type="button" onClick={() => void updateStatus("COMPLETED")}><CheckCircle2 /> Marquer terminé</button> : null}
                  {activeAppointment.status !== "CANCELLED" ? <button className="quiet-command" type="button" onClick={() => void updateStatus("CANCELLED")}><X /> Annuler</button> : null}
                  <button className="danger-command" type="button" onClick={() => void removeAppointment()}><Trash2 /> Supprimer</button>
                </div>
              </section>
            ) : null}
            <section className="record-grid">
              <div>
                <h3>Rendez-vous</h3>
                {!details.appointments.length ? <p className="empty">Aucun rendez-vous enregistré.</p> : details.appointments.map((item) => (
                  <article key={item.id}><time>{appointmentDateTime(item)}</time><span>{item.reason}</span><Status value={item.status} /></article>
                ))}
              </div>
              <div>
                <h3>Consultations</h3>
                {!details.consultations.length ? <p className="empty">Aucune consultation enregistrée.</p> : details.consultations.map((consultation) => (
                  <article key={consultation.id}>
                    <time>{formatDateTime(consultation.createdAt)}</time>
                    <strong>{consultation.diagnosis}</strong>
                    <span>Symptômes : {consultation.symptoms}</span>
                    <span>{consultation.treatment}</span>
                    <small>Actes : {consultation.medicalActs.join(", ") || "Non renseignés"}</small>
                    <small>Tarif indicatif : {money(consultation.priceCents)}</small>
                  </article>
                ))}
              </div>
              <div>
                <h3>Suivi financier</h3>
                {!details.invoices.length ? <p className="empty">Aucun encaissement.</p> : details.invoices.map((invoice) => (
                  <article key={invoice.id} className="payment-entry">
                    <time>{formatDateTime(invoice.createdAt)}</time>
                    <strong>+ {money(invoice.amountCents)}</strong>
                    <span>{invoice.number} - {invoice.paidAt ? "Encaissé" : "À encaisser"}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {message ? <output>{message}</output> : null}
      </section>
    </div>
  );
}

function PatientsPage({ patients, token, onChanged }: { patients: PatientSummary[]; token: string; onChanged: () => void }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");

  return (
    <>
      <section className="admin-page admin-grid">
        <Panel title="Tous les patients" subtitle="Ouvrez un dossier pour consulter son suivi complet.">
          <PatientList patients={patients} onSelect={setSelectedPatientId} />
        </Panel>
        <CreatePatient token={token} onCreated={onChanged} />
      </section>
      {selectedPatientId ? <PatientRecordModal patientId={selectedPatientId} token={token} onClose={() => setSelectedPatientId("")} onChanged={onChanged} /> : null}
    </>
  );
}

function ConsultationsPage({ token, patients, appointments, onChanged }: { token: string; patients: PatientSummary[]; appointments: AppointmentSummary[]; onChanged: () => void }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [search, setSearch] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const todayPatientIds = useMemo(() => {
    const today = dateInput(new Date());
    return new Set(appointments.filter((appointment) => appointment.startsAt.startsWith(today) && appointment.status !== "CANCELLED").map((appointment) => appointment.patientId));
  }, [appointments]);
  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const matchesSearch = !query || fullName.includes(query) || patient.phone.toLowerCase().includes(query);
      const matchesToday = !todayOnly || todayPatientIds.has(patient.id);
      return matchesSearch && matchesToday;
    });
  }, [patients, search, todayOnly, todayPatientIds]);

  return (
    <>
      <section className="admin-page consultation-page">
        <DictationTool token={token} patients={filteredPatients} patientFilter={<ConsultationFilters search={search} todayOnly={todayOnly} onSearch={setSearch} onTodayOnly={setTodayOnly} />} onSaved={onChanged} />
        <Panel title="Patients disponibles" subtitle="Ouvrez le dossier pour voir les consultations enregistrées.">
          <ConsultationFilters search={search} todayOnly={todayOnly} onSearch={setSearch} onTodayOnly={setTodayOnly} />
          <PatientList patients={filteredPatients} onSelect={setSelectedPatientId} />
        </Panel>
      </section>
      {selectedPatientId ? <PatientRecordModal patientId={selectedPatientId} token={token} onClose={() => setSelectedPatientId("")} onChanged={onChanged} /> : null}
    </>
  );
}

function OrdonnancePage({ patients, token }: { patients: PatientSummary[]; token: string }) {
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [medicines, setMedicines] = useState([""]);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [savedOrdonnances, setSavedOrdonnances] = useState<OrdonnanceSummary[]>([]);
  const [message, setMessage] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? patients[0] ?? null;
  const content = medicines.map((medicine) => medicine.trim()).filter(Boolean).join("\n");
  const patientResults = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (!showPatientResults || query.length < 2) return [];
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return fullName.includes(query) || patient.phone.toLowerCase().includes(query);
    }).slice(0, 8);
  }, [patientQuery, patients]);

  useEffect(() => {
    if (patientId && !patients.some((patient) => patient.id === patientId)) setPatientId(patients[0]?.id ?? "");
  }, [patientId, patients]);

  useEffect(() => {
    api<OrdonnanceSummary[]>("/api/ordonnances", auth(token))
      .then(setSavedOrdonnances)
      .catch((error) => setMessage(readError(error)));
  }, [token]);

  function pickPatient(patient: PatientSummary) {
    setPatientId(patient.id);
    setPatientQuery(`${patient.firstName} ${patient.lastName}`.trim());
    setShowPatientResults(false);
  }

  function updateMedicine(index: number, value: string) {
    setMedicines((current) => current.map((medicine, itemIndex) => itemIndex === index ? value : medicine));
  }

  function addMedicine() {
    setMedicines((current) => [...current, ""]);
  }

  function removeMedicine(index: number) {
    setMedicines((current) => current.length === 1 ? [""] : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function generateOrdonnance(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");
    if (!selectedPatient || !content.trim()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const template = await loadImage("/images/template.png");
    canvas.width = 1536;
    canvas.height = 1024;

    context.drawImage(template, 0, 0, canvas.width, canvas.height);

    context.fillStyle = "#12323c";
    context.font = "400 26px Arial";
    context.fillText(`Patient : ${selectedPatient.firstName} ${selectedPatient.lastName}`.trim(), 190, 300);
    if (selectedPatient.phone) context.fillText(`Téléphone : ${selectedPatient.phone}`, 190, 340);

    context.textAlign = "right";
    context.fillText(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 1345, 300);
    context.textAlign = "left";

    context.font = "400 30px Arial";
    drawWrappedText(context, content.trim(), 205, 440, 1130, 46);

    const imageDataUrl = canvas.toDataURL("image/png");
    setGeneratedUrl(imageDataUrl);

    try {
      const saved = await api<OrdonnanceSummary>("/api/ordonnances", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({ patientId: selectedPatient.id, content: content.trim(), imageDataUrl })
      });
      setSavedOrdonnances((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMessage("Ordonnance enregistrée.");
    } catch (error) {
      setMessage(readError(error));
    }
  }

  function printOrdonnance(imageUrl = generatedUrl) {
    if (!imageUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Ordonnance</title><style>body{margin:0;display:grid;place-items:center;background:#fff}img{max-width:100%;height:auto}</style></head><body><img src="${imageUrl}" alt="Ordonnance" /></body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <section className="admin-page ordonnance-page">
      <Panel title="Ordonnance" subtitle="Sélectionnez un patient, rédigez l'ordonnance, puis générez le document.">
        <form className="stack-form ordonnance-form" onSubmit={generateOrdonnance}>
          <label>
            Patient
            <span className="patient-search-field">
              <input required value={patientQuery} onFocus={() => setShowPatientResults(true)} onChange={(event) => { setPatientQuery(event.target.value); setPatientId(""); setShowPatientResults(true); }} placeholder="Tapez le nom du patient" />
              {patientResults.length ? (
                <div className="patient-search-results">
                  {patientResults.map((patient) => (
                    <button key={patient.id} type="button" onClick={() => pickPatient(patient)}>
                      <strong>{patient.firstName} {patient.lastName}</strong>
                      <span>{patient.phone || "Téléphone non renseigné"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
          </label>
          <div className="medicine-fields">
            <span>Médicaments / lignes d'ordonnance</span>
            {medicines.map((medicine, index) => (
              <label key={index}>
                Médicament {index + 1}
                <div>
                  <input required={index === 0} value={medicine} onChange={(event) => updateMedicine(index, event.target.value)} placeholder="Ex : Amoxicilline 1g, matin et soir pendant 7 jours" />
                  <button className="quiet-command" disabled={medicines.length === 1} type="button" onClick={() => removeMedicine(index)}><X /> Retirer</button>
                </div>
              </label>
            ))}
            <button className="quiet-command" type="button" onClick={addMedicine}><ClipboardPlus /> Ajouter une ligne</button>
          </div>
          <button disabled={!selectedPatient || !content.trim()}><ClipboardPlus /> Générer</button>
          {message ? <output>{message}</output> : null}
        </form>
      </Panel>

      <Panel title="Aperçu" subtitle="Le document généré utilise le template du cabinet.">
        <canvas ref={canvasRef} hidden />
        {generatedUrl ? (
          <div className="ordonnance-preview">
            <img src={generatedUrl} alt="Ordonnance générée" />
            <div className="inline-actions">
              <a className="download-command" download={`ordonnance-${selectedPatient?.firstName ?? "patient"}-${selectedPatient?.lastName ?? ""}.png`} href={generatedUrl}><FileText /> Télécharger</a>
              <button type="button" onClick={() => printOrdonnance()}><FileText /> Imprimer</button>
            </div>
          </div>
        ) : <p className="empty">Aucune ordonnance générée.</p>}
      </Panel>

      <Panel title="Ordonnances enregistrées" subtitle="Documents sauvegardés dans PostgreSQL.">
        {!savedOrdonnances.length ? <p className="empty">Aucune ordonnance sauvegardée.</p> : (
          <div className="ordonnance-history">
            {savedOrdonnances.map((ordonnance) => (
              <article key={ordonnance.id}>
                <div>
                  <strong>{ordonnance.patientName}</strong>
                  <span>{formatDateTime(ordonnance.createdAt)}</span>
                </div>
                <p>{ordonnance.content}</p>
                <div className="inline-actions">
                  <a className="download-command" download={`ordonnance-${ordonnance.patientName.replace(/\s+/g, "-")}.png`} href={ordonnance.imageDataUrl}><FileText /> Télécharger</a>
                  <button type="button" onClick={() => printOrdonnance(ordonnance.imageDataUrl)}><FileText /> Imprimer</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}

function ConsultationFilters({ search, todayOnly, onSearch, onTodayOnly }: { search: string; todayOnly: boolean; onSearch: (value: string) => void; onTodayOnly: (value: boolean) => void }) {
  return (
    <div className="consultation-filters">
      <label className="search"><Search /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Rechercher par nom" /></label>
      <label className="today-filter"><input checked={todayOnly} onChange={(event) => onTodayOnly(event.target.checked)} type="checkbox" /> Rendez-vous d'aujourd'hui</label>
    </div>
  );
}

function FinancePage({ token, finance, activity, revenueSeries, revenueRange, onRevenueRangeChange, reminders, platform }: { token: string; finance: FinanceSummary | null; activity: FinanceActivity[]; revenueSeries: RevenueSeries | null; revenueRange: RevenueRange; onRevenueRangeChange: (range: RevenueRange) => void; reminders: Reminder[]; platform: PlatformStats | null }) {
  return (
    <div className="admin-page">
      <section className="metrics finance-metrics">
        <Metric icon={<CreditCard />} label="Encaissé" value={money(finance?.revenueCents)} detail={`${finance?.invoices ?? 0} opération(s)`} />
        <Metric icon={<CreditCard />} label="À encaisser" value={money(finance?.unpaidCents)} detail="À relancer" />
        <Metric icon={<CreditCard />} label="Paiements espèces" value={money(finance?.payments.cashCents)} detail="Recettes du mois" />
      </section>
      <RevenueCharts series={revenueSeries} range={revenueRange} onRangeChange={onRevenueRangeChange} />
      <section className="admin-grid finance-grid">
        <RevenuePanel activity={activity} />
        <InvoiceTool token={token} />
      </section>
      <section className="admin-grid finance-grid">
        <OperationsPanel reminders={reminders} platform={platform} />
      </section>
    </div>
  );
}

function RevenueCharts({ series, range, onRangeChange }: { series: RevenueSeries | null; range: RevenueRange; onRangeChange: (range: RevenueRange) => void }) {
  const buckets = series?.buckets ?? [];
  const totals = buckets.reduce((summary, bucket) => ({
    paidCents: summary.paidCents + bucket.paidCents,
    unpaidCents: summary.unpaidCents + bucket.unpaidCents,
    cashCents: summary.cashCents + bucket.cashCents
  }), { paidCents: 0, unpaidCents: 0, cashCents: 0 });

  return (
    <Panel title="Courbes de revenus" subtitle="Filtrez les encaissements par période.">
      <div className="revenue-chart-tools" role="tablist" aria-label="Période des revenus">
        {([
          ["24h", "24h"],
          ["7d", "7 jours"],
          ["30d", "30 jours"],
          ["month", "Mois"]
        ] as Array<[RevenueRange, string]>).map(([value, label]) => (
          <button className={range === value ? "active" : undefined} key={value} onClick={() => onRangeChange(value)} type="button">{label}</button>
        ))}
      </div>
      <div className="revenue-chart-grid">
        <LineChart title="Encaissé" value={money(totals.paidCents)} buckets={buckets} field="paidCents" color="#0b7566" />
        <LineChart title="À encaisser" value={money(totals.unpaidCents)} buckets={buckets} field="unpaidCents" color="#e07850" />
        <LineChart title="Espèces" value={money(totals.cashCents)} buckets={buckets} field="cashCents" color="#2f6f9f" />
      </div>
    </Panel>
  );
}

function LineChart({ title, value, buckets, field, color }: { title: string; value: string; buckets: RevenueBucket[]; field: keyof Pick<RevenueBucket, "paidCents" | "unpaidCents" | "cashCents">; color: string }) {
  const width = 320;
  const height = 132;
  const padding = 12;
  const max = Math.max(...buckets.map((bucket) => bucket[field]), 1);
  const points = buckets.map((bucket, index) => {
    const x = buckets.length <= 1 ? padding : padding + (index / (buckets.length - 1)) * (width - padding * 2);
    const y = height - padding - (bucket[field] / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  const area = points ? `${padding},${height - padding} ${points} ${width - padding},${height - padding}` : "";
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 4));

  return (
    <article className="line-chart">
      <header><span>{title}</span><strong>{value}</strong></header>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} ${value}`}>
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        {area ? <polygon points={area} style={{ fill: color, opacity: 0.12 }} /> : null}
        {points ? <polyline points={points} style={{ stroke: color }} /> : null}
      </svg>
      <div className="chart-labels">
        {buckets.filter((_, index) => index % labelEvery === 0 || index === buckets.length - 1).map((bucket) => <span key={`${title}-${bucket.start}`}>{bucket.label}</span>)}
      </div>
    </article>
  );
}

function RevenuePanel({ activity }: { activity: FinanceActivity[] }) {
  return (
    <Panel title="Activité et encaissements" subtitle="Chaque confirmation de rendez-vous ajoute automatiquement 40 TND.">
      {!activity.length ? <p className="empty">Aucun encaissement enregistré.</p> : (
        <div className="finance-activity">
          {activity.map((entry) => (
            <article key={entry.id}>
              <div><strong>{entry.patientName}</strong><small>{formatDateTime(entry.createdAt)} - {entry.number}</small></div>
              <b>+ {money(entry.amountCents)}</b>
              <span>{entry.paidAt ? "Encaissé" : "À encaisser"}</span>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function OperationsPanel({ reminders, platform }: { reminders: Reminder[]; platform: PlatformStats | null }) {
  return (
    <Panel title="Rappels et sécurité" subtitle="Événements opérationnels.">
      <div className="reminders">
        {reminders.map((reminder) => <article key={reminder.id}><BellRing /><strong>{reminder.message}</strong><span>{reminder.channel} - {reminder.status} - {reminder.target}</span></article>)}
        {platform ? <article><ShieldCheck /><strong>{platform.clinics} cabinet actif, {platform.doctors} dentiste</strong><span>MRR {money(platform.monthlyRecurringRevenueCents)} - {platform.auditEvents24h} audits / 24h</span></article> : null}
        {!reminders.length && !platform ? <p className="empty">Aucun rappel opérationnel.</p> : null}
      </div>
    </Panel>
  );
}

function PatientList({ patients, onSelect }: { patients: PatientSummary[]; onSelect?: (id: string) => void }) {
  if (!patients.length) return <p className="empty">Aucun patient trouvé.</p>;

  return (
    <div className="patient-list">
      {patients.map((patient) => (
        <article key={patient.id} className={onSelect ? "selectable-patient" : undefined}>
          {onSelect ? (
            <button className="patient-command" type="button" onClick={() => onSelect(patient.id)}>
              <strong>{patient.firstName} {patient.lastName}</strong>
              <span>{patient.phone || "Téléphone non renseigné"}</span>
              <small>{patient.allergies.join(", ") || "Aucune allergie signalée"}</small>
            </button>
          ) : (
            <>
              <strong>{patient.firstName} {patient.lastName}</strong>
              <span>{patient.phone || "Téléphone non renseigné"}</span>
              <small>{patient.allergies.join(", ") || "Aucune allergie signalée"}</small>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function CreateAppointment({ token, onCreated, selectedDate = tomorrowDate(), selectedTime = "10:00" }: { token: string; onCreated: () => void; selectedDate?: string; selectedTime?: string }) {
  const [form, setForm] = useState({ patientName: "", date: selectedDate, time: selectedTime, reason: "Consultation", status: "CONFIRMED" as AppointmentStatus });
  const [message, setMessage] = useState("");

  useEffect(() => setForm((current) => ({ ...current, date: selectedDate })), [selectedDate]);
  useEffect(() => setForm((current) => ({ ...current, time: selectedTime })), [selectedTime]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = new Date(`${form.date}T${form.time}`);
    try {
      await api("/api/appointments", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({ patientName: form.patientName, startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(), status: form.status, reason: form.reason })
      });
      setMessage("Rendez-vous ajouté.");
      setForm((current) => ({ ...current, patientName: "" }));
      onCreated();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return <Panel title="Nouveau rendez-vous" subtitle="Création directe par l'équipe. Un rendez-vous confirmé ajoute 40 TND."><form className="stack-form" onSubmit={submit}><label>Patient<input required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} /></label><div className="form-pair"><label>Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Heure<input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Motif<input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><label>Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}><option value="CONFIRMED">Confirmé</option><option value="PENDING">En attente</option><option value="COMPLETED">Terminé</option><option value="CANCELLED">Annulé</option></select></label><button><CalendarCheck /> Ajouter</button>{message ? <output>{message}</output> : null}</form></Panel>;
}

function CreatePatient({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "", medicalHistory: "", allergies: "", chronicConditions: "" });
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/patients", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({ ...form, allergies: csv(form.allergies), chronicConditions: csv(form.chronicConditions) })
      });
      setMessage("Patient ajouté.");
      setForm({ firstName: "", lastName: "", phone: "", email: "", address: "", medicalHistory: "", allergies: "", chronicConditions: "" });
      onCreated();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return <Panel title="Nouveau patient" subtitle="Coordonnées et informations médicales."><form className="stack-form" onSubmit={submit}><div className="form-pair"><label>Prénom<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label><label>Nom<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label></div><div className="form-pair"><label>Téléphone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><label>Adresse<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label>Allergies<input value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })} placeholder="Pénicilline, AINS" /></label><label>Pathologies chroniques<input value={form.chronicConditions} onChange={(event) => setForm({ ...form, chronicConditions: event.target.value })} /></label><label>Antécédents médicaux<textarea value={form.medicalHistory} onChange={(event) => setForm({ ...form, medicalHistory: event.target.value })} /></label><button><UserRoundPlus /> Créer</button>{message ? <output>{message}</output> : null}</form></Panel>;
}

function DictationTool({ token, patients, patientFilter, onSaved }: { token: string; patients: PatientSummary[]; patientFilter?: ReactNode; onSaved: () => void }) {
  const [patientId, setPatientId] = useState("");
  const [rawDictation, setRawDictation] = useState("");
  const [note, setNote] = useState<StructuredMedicalNote | null>(null);
  const [consultation, setConsultation] = useState("");
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dictationBeforeSpeechRef = useRef("");

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
    if (patientId && !patients.some((patient) => patient.id === patientId)) setPatientId(patients[0]?.id ?? "");
  }, [patientId, patients]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) return;

    void refreshMicrophones(false);
    const onDeviceChange = () => void refreshMicrophones(false);
    mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => mediaDevices.removeEventListener("devicechange", onDeviceChange);
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    stopInputStream();
  }, []);

  function stopInputStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  async function refreshMicrophones(requestPermission: boolean) {
    if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
      setSpeechStatus("unsupported");
      setSpeechMessage("La sélection du microphone n'est pas disponible dans ce navigateur.");
      return;
    }

    let permissionStream: MediaStream | null = null;
    try {
      if (requestPermission) permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
      setMicrophones(inputs);
      setSelectedMicrophoneId((current) => current && !inputs.some((device) => device.deviceId === current) ? "" : current);
      if (requestPermission) {
        setSpeechStatus("idle");
        setSpeechMessage(inputs.length ? "Microphones disponibles. Sélectionnez celui à utiliser pour la dictée." : "Aucun microphone détecté.");
      }
    } catch {
      setSpeechStatus("error");
      setSpeechMessage("Accès au microphone refusé. Autorisez le microphone pour voir et sélectionner vos appareils.");
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function toggleRecording() {
    if (speechStatus === "listening") {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as SpeechEnabledWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechStatus("unsupported");
      setSpeechMessage("La transcription vocale n'est pas disponible dans ce navigateur. Utilisez Chrome ou Edge, ou saisissez la dictée.");
      return;
    }

    const recognition = new Recognition();
    dictationBeforeSpeechRef.current = rawDictation.trim();
    recognitionRef.current = recognition;
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let currentInterim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript.trim() ?? "";
        if (event.results[index].isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          currentInterim = `${currentInterim} ${transcript}`.trim();
        }
      }
      setInterimTranscript(currentInterim);
      setRawDictation(joinText(dictationBeforeSpeechRef.current, finalTranscript));
    };
    recognition.onerror = (event) => {
      setSpeechStatus("error");
      setSpeechMessage(speechRecognitionError(event.error));
      setInterimTranscript("");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      stopInputStream();
      setSpeechStatus((current) => current === "error" ? current : "idle");
      setInterimTranscript("");
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("media-devices-unavailable");
      }
      const inputStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true
      });
      const audioTrack = inputStream.getAudioTracks()[0];
      if (!audioTrack) {
        inputStream.getTracks().forEach((track) => track.stop());
        throw new Error("missing-audio-track");
      }
      mediaStreamRef.current = inputStream;
      await refreshMicrophones(false);
      recognition.start(audioTrack);
      setSpeechStatus("listening");
      setSpeechMessage("");
      setInterimTranscript("");
    } catch {
      recognitionRef.current = null;
      stopInputStream();
      setSpeechStatus("error");
      setSpeechMessage("Impossible de démarrer ce microphone. Vérifiez son autorisation ou sélectionnez un autre appareil.");
    }
  }

  async function structure() {
    try {
      setNote(await api<StructuredMedicalNote>("/api/ai/structure-dictation", { ...auth(token), method: "POST", body: JSON.stringify({ rawText: rawDictation }) }));
      setConsultation("");
    } catch (error) {
      setConsultation(readError(error));
    }
  }

  async function saveConsultation() {
    try {
      const saved = await api<ConsultationSummary>("/api/consultations/from-dictation", { ...auth(token), method: "POST", body: JSON.stringify({ patientId, rawDictation }) });
      setConsultation(`Consultation enregistrée le ${formatDateTime(saved.createdAt)}.`);
      onSaved();
    } catch (error) {
      setConsultation(readError(error));
    }
  }

  const listening = speechStatus === "listening";

  return (
    <Panel title="Consultation IA" subtitle="Dictée vocale et structuration de note dentaire.">
      <div className="stack-form">
        <label>
          Patient
          {patientFilter}
          <select value={patientId} onChange={(event) => setPatientId(event.target.value)}>
            {patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.firstName} {patient.lastName}</option>)}
          </select>
        </label>
        <label className="dictation-field">
          <span className="dictation-heading">
            Dictée
            {listening ? <small><i /> Enregistrement en cours</small> : null}
          </span>
          <textarea
            disabled={listening}
            placeholder="Décrivez les symptômes et les soins, ou utilisez le microphone."
            rows={8}
            value={rawDictation}
            onChange={(event) => setRawDictation(event.target.value)}
          />
        </label>
        <div className="microphone-picker">
          <label>
            Microphone
            <select disabled={listening} value={selectedMicrophoneId} onChange={(event) => setSelectedMicrophoneId(event.target.value)}>
              <option value="">Microphone par defaut</option>
              {microphones.map((device, index) => (
                <option value={device.deviceId} key={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
          <button className="microphone-command" disabled={listening} type="button" onClick={() => void refreshMicrophones(true)}>
            <Mic /> Autoriser / actualiser
          </button>
        </div>
        <div className="dictation-recorder">
          <button className={listening ? "recording-command" : undefined} type="button" onClick={() => void toggleRecording()}>
            {listening ? <Square /> : <Mic />}
            {listening ? "Arreter" : "Dicter la consultation"}
          </button>
          <p>La dictée utilise le microphone sélectionné; vérifiez le texte avant enregistrement.</p>
        </div>
        {interimTranscript ? <p className="live-transcript"><strong>Ecoute :</strong> {interimTranscript}</p> : null}
        {speechMessage ? <output className={speechStatus === "idle" || listening ? undefined : "error"}>{speechMessage}</output> : null}
        <div className="inline-actions">
          <button type="button" onClick={structure} disabled={listening || rawDictation.trim().length < 3}><Activity /> Structurer</button>
          <button type="button" onClick={saveConsultation} disabled={listening || !patientId || rawDictation.trim().length < 3}><FileText /> Enregistrer</button>
        </div>
        {note ? <article className="note"><strong>{note.reason}</strong><span>{note.symptoms.join(" | ")}</span><small>{note.treatmentPlan}</small></article> : null}
        {consultation ? <output>{consultation}</output> : null}
      </div>
    </Panel>
  );
}

function InvoiceTool({ token }: { token: string }) {
  const [patientName, setPatientName] = useState("");
  const [amount, setAmount] = useState("60");
  const [invoice, setInvoice] = useState<InvoicePreview | null>(null);
  const [error, setError] = useState("");

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      setInvoice(await api<InvoicePreview>("/api/finance/invoice-preview", { ...auth(token), method: "POST", body: JSON.stringify({ patientName, amountCents: Math.round(Number(amount) * 100) }) }));
    } catch (caught) {
      setError(readError(caught));
    }
  }

  return <Panel title="Facture" subtitle="Aperçu avant génération PDF."><form className="stack-form" onSubmit={preview}><label>Patient<input required value={patientName} onChange={(event) => setPatientName(event.target.value)} /></label><label>Montant TND<input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button><CreditCard /> Prévisualiser</button>{invoice ? <article className="invoice"><strong>{invoice.number}</strong><span>{invoice.patientName}</span><b>{money(invoice.amountCents)}</b></article> : null}{error ? <output>{error}</output> : null}</form></Panel>;
}

function AppointmentTimeline({ appointments }: { appointments: AppointmentSummary[] }) {
  const ordered = useMemo(() => [...appointments].sort((left, right) => left.startsAt.localeCompare(right.startsAt)), [appointments]);
  if (!ordered.length) return <p className="empty">Aucun rendez-vous. Les demandes publiques arrivent ici.</p>;
  return <div className="timeline">{ordered.map((appointment) => <article key={appointment.id}><time>{new Date(appointment.startsAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time><strong>{appointment.patientName}</strong><span>{appointment.reason}</span><Status value={appointment.status} /></article>)}</div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="panel"><header><h2>{title}</h2><p>{subtitle}</p></header>{children}</section>;
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <article className="metric"><span>{icon}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="feature"><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>;
}

function BrandLogo() {
  return <span className="brand-logo" aria-hidden="true"><img src="/images/logo.png" alt="" /></span>;
}

function Status({ value }: { value: AppointmentStatus }) {
  return <em className={`status ${value.toLowerCase()}`}>{statusLabel(value)}</em>;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    throw new Error(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? `Erreur API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function csv(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function joinText(first: string, second: string) {
  return [first, second].filter(Boolean).join(" ").trim();
}

function speechRecognitionError(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") return "Accès au microphone refusé. Autorisez le microphone pour dicter la consultation.";
  if (error === "no-speech") return "Aucune parole détectée. Relancez la dictée et parlez près du microphone.";
  if (error === "audio-capture") return "Aucun microphone disponible sur cet appareil.";
  if (error === "network") return "Le service de reconnaissance vocale du navigateur est indisponible.";
  return "La transcription vocale a échoué. Vous pouvez recommencer ou saisir le texte.";
}

function money(cents = 0) {
  return `${(cents / 100).toLocaleString("fr-FR")} TND`;
}

function statusLabel(status: AppointmentStatus) {
  return ({ CONFIRMED: "Confirmé", PENDING: "En attente", CANCELLED: "Annulé", COMPLETED: "Terminé" } as const)[status];
}

function roleLabel(role: UserRole) {
  return ({ DOCTOR: "Dentiste", SECRETARY: "Secrétariat", SAAS_ADMIN: "Administration" } as const)[role];
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateInput(date);
}

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readableDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function timeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function appointmentDateTime(appointment: AppointmentSummary) {
  const startsAt = formatDateTime(appointment.startsAt);
  const endsAt = new Date(appointment.endsAt).toLocaleTimeString("fr-FR", { timeStyle: "short" });
  return `${startsAt} - ${endsAt}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const paragraphs = text.split(/\n+/);
  let currentY = y;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = candidate;
      }
    }
    if (line) {
      context.fillText(line, x, currentY);
      currentY += lineHeight;
    }
    currentY += lineHeight * 0.35;
  }
}

function splitDisplayName(value: string) {
  const [firstName, ...lastNameParts] = value.trim().split(/\s+/);
  return {
    firstName: firstName || "Patient",
    lastName: lastNameParts.join(" ")
  };
}

function currentAdminPage(): AdminPage {
  const path = window.location.pathname.replace(/\/+$/, "");
  const legacyHash = window.location.hash.replace("#", "");

  if (path === "/admin/agenda" || legacyHash === "agenda") return "agenda";
  if (path === "/admin/patients" || legacyHash === "patients") return "patients";
  if (path === "/admin/consultations" || legacyHash === "consultation") return "consultations";
  if (path === "/admin/ordonnance" || legacyHash === "ordonnance") return "ordonnance";
  if (path === "/admin/finance" || legacyHash === "finance") return "finance";
  return "dashboard";
}

function parseUser(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return null;
  }
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
