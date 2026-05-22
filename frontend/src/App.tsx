import { PRIMARY_DOCTOR, type AppointmentStatus, type AppointmentSummary, type PatientSummary, type StructuredMedicalNote, type UserRole } from "@medcabinet/shared";
import {
  Activity,
  BellRing,
  CalendarCheck,
  ClipboardPlus,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  Users
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { revenueSeries } from "./lib/mock-data";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const savedTokenKey = "firassayari-token";
const savedUserKey = "firassayari-user";

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
type AdminPage = "dashboard" | "agenda" | "patients" | "consultations" | "finance";

const adminPages: Array<{ page: AdminPage; href: string; label: string; icon: ReactNode }> = [
  { page: "dashboard", href: "/admin", label: "Tableau", icon: <Activity /> },
  { page: "agenda", href: "/admin/agenda", label: "Agenda", icon: <CalendarCheck /> },
  { page: "patients", href: "/admin/patients", label: "Patients", icon: <Users /> },
  { page: "consultations", href: "/admin/consultations", label: "Consultations", icon: <FileText /> },
  { page: "finance", href: "/admin/finance", label: "Finance", icon: <CreditCard /> }
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
    reason: "Consultation de medecine generale"
  });
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setMessage("Votre demande est enregistree. Le cabinet confirmera le rendez-vous.");
      setForm((current) => ({ ...current, patientName: "", phone: "" }));
    } catch (error) {
      setRequestState("error");
      setMessage(readError(error));
    }
  }

  return (
    <main className="site">
      <header className="public-nav">
        <a className="doctor-mark" href="/" aria-label="Accueil Dr Firas Sayari">
          <span>FS</span>
          <strong>Dr Firas Sayari</strong>
        </a>
        <nav aria-label="Navigation publique">
          <a href="#rdv">Rendez-vous</a>
          <a href="#cabinet">Cabinet</a>
          <a className="nav-command" href="/admin"><ShieldCheck /> Admin</a>
        </nav>
      </header>

      <section className="hero">
        <img src="/images/dr-firas-hero.png" alt="Consultation au cabinet de Dr Firas Sayari" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">Medecine generale</p>
          <h1>Dr Firas Sayari</h1>
          <p>Un rendez-vous clair, un accueil attentif et un suivi medical organise pour chaque patient.</p>
          <div className="hero-actions">
            <a href="#rdv"><CalendarCheck /> Prendre rendez-vous</a>
            <a href="#cabinet" className="quiet-action"><Stethoscope /> Decouvrir le cabinet</a>
          </div>
        </div>

        <form id="rdv" className="booking-tool" onSubmit={requestAppointment}>
          <div>
            <p>Demande de rendez-vous</p>
            <strong>Choisissez votre creneau</strong>
          </div>
          <label>
            Nom complet
            <input required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} placeholder="Votre nom" />
          </label>
          <label>
            Telephone
            <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+216 ..." />
          </label>
          <label>
            Date
            <input required type="date" value={form.date} min={tomorrowDate()} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label>
            Heure
            <select value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>
              {["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"].map((time) => <option key={time}>{time}</option>)}
            </select>
          </label>
          <label className="booking-reason">
            Motif
            <input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          </label>
          <button disabled={requestState === "sending"}><ClipboardPlus /> {requestState === "sending" ? "Envoi..." : "Demander le RDV"}</button>
          {message ? <output className={requestState}>{message}</output> : null}
        </form>
      </section>

      <section id="cabinet" className="cabinet-band">
        <div>
          <p className="eyebrow">Pour les patients</p>
          <h2>Une consultation mieux preparee des l'arrivee.</h2>
        </div>
        <Feature icon={<Stethoscope />} title="Evaluation attentive" text="Consultations de medecine generale avec priorite aux symptomes, antecedents et suivi." />
        <Feature icon={<CalendarCheck />} title="Agenda lisible" text="Demandes en ligne suivies par le cabinet avant confirmation du creneau." />
        <Feature icon={<FileText />} title="Suivi organise" text="Dossiers, facturation et notes de consultation centralises cote equipe." />
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
      <a className="doctor-mark" href="/"><span>FS</span><strong>Dr Firas Sayari</strong></a>
      <form onSubmit={login}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Acces cabinet</h1>
        </div>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button><LogIn /> Connexion</button>
        {error ? <output className="error">{error}</output> : null}
      </form>
    </main>
  );
}

function AdminWorkspace({ token, user, onLogout }: { token: string; user: SessionUser; onLogout: () => void }) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [platform, setPlatform] = useState<PlatformStats | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshId, setRefreshId] = useState(0);

  useEffect(() => {
    const options = auth(token);
    Promise.all([
      api<AppointmentSummary[]>("/api/appointments", options),
      api<PatientSummary[]>(`/api/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`, options),
      api<FinanceSummary>("/api/finance/monthly-summary", options),
      api<Reminder[]>("/api/notifications/reminders", options)
    ])
      .then(([nextAppointments, nextPatients, nextFinance, nextReminders]) => {
        setAppointments(nextAppointments);
        setPatients(nextPatients);
        setFinance(nextFinance);
        setReminders(nextReminders);
      })
      .catch((error) => setNotice(readError(error)));
  }, [refreshId, search, token]);

  useEffect(() => {
    if (user.role !== "SAAS_ADMIN") return;
    api<PlatformStats>("/api/admin/platform-stats", auth(token)).then(setPlatform).catch((error) => setNotice(readError(error)));
  }, [token, user.role]);

  const page = currentAdminPage();
  const pending = appointments.filter((appointment) => appointment.status === "PENDING").length;
  const title = adminPages.find((route) => route.page === page)?.label ?? "Tableau";

  return (
    <main className="admin-shell">
      <aside>
        <a className="doctor-mark" href="/"><span>FS</span><strong>Dr Firas Sayari</strong></a>
        <nav aria-label="Administration">
          {adminPages.map((route) => (
            <a key={route.page} className={page === route.page ? "active" : undefined} href={route.href}>
              {route.icon}
              {route.label}
            </a>
          ))}
        </nav>
        <button onClick={onLogout}><LogOut /> Deconnexion</button>
      </aside>

      <section className="workspace">
        <header>
          <div>
            <p className="eyebrow">{user.role.replaceAll("_", " ")}</p>
            <h1>{title}</h1>
            <span>Bonjour {user.displayName}</span>
          </div>
          {page === "patients" ? <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un patient" /></label> : null}
        </header>
        {notice ? <output className="workspace-notice">{notice}</output> : null}
        {page === "dashboard" ? <AdminOverview appointments={appointments} patients={patients} finance={finance} reminders={reminders} platform={platform} pending={pending} /> : null}
        {page === "agenda" ? <AgendaPage appointments={appointments} token={token} onCreated={() => setRefreshId((value) => value + 1)} /> : null}
        {page === "patients" ? <PatientsPage patients={patients} token={token} onCreated={() => setRefreshId((value) => value + 1)} /> : null}
        {page === "consultations" ? <ConsultationsPage token={token} patients={patients} /> : null}
        {page === "finance" ? <FinancePage token={token} finance={finance} reminders={reminders} platform={platform} /> : null}
      </section>
    </main>
  );
}

function AdminOverview({ appointments, patients, finance, reminders, platform, pending }: { appointments: AppointmentSummary[]; patients: PatientSummary[]; finance: FinanceSummary | null; reminders: Reminder[]; platform: PlatformStats | null; pending: number }) {
  return (
    <div className="admin-page">
      <section className="metrics">
        <Metric icon={<CalendarCheck />} label="Rendez-vous" value={String(appointments.length)} detail={`${pending} demande(s) en attente`} />
        <Metric icon={<Users />} label="Patients visibles" value={String(patients.length)} detail="Dossiers disponibles" />
        <Metric icon={<CreditCard />} label="Revenu du mois" value={money(finance?.revenueCents)} detail={`${finance?.invoices ?? 0} facture(s)`} />
        <Metric icon={<BellRing />} label="Rappels" value={String(reminders.length)} detail="SMS et email" />
      </section>
      <section className="admin-grid">
        <Panel title="Prochains rendez-vous" subtitle="Apercu de l'agenda du cabinet.">
          <AppointmentTimeline appointments={appointments.slice(0, 5)} />
        </Panel>
        <OperationsPanel reminders={reminders} platform={platform} />
      </section>
    </div>
  );
}

function AgendaPage({ appointments, token, onCreated }: { appointments: AppointmentSummary[]; token: string; onCreated: () => void }) {
  return (
    <section className="admin-page admin-grid agenda-grid">
      <Panel title="Agenda du cabinet" subtitle="Demandes patients et rendez-vous internes.">
        <AppointmentTimeline appointments={appointments} />
      </Panel>
      <CreateAppointment token={token} onCreated={onCreated} />
    </section>
  );
}

function PatientsPage({ patients, token, onCreated }: { patients: PatientSummary[]; token: string; onCreated: () => void }) {
  return (
    <section className="admin-page admin-grid">
      <Panel title="Patients" subtitle="Dossiers recents et coordonnees.">
        <PatientList patients={patients} />
      </Panel>
      <CreatePatient token={token} onCreated={onCreated} />
    </section>
  );
}

function ConsultationsPage({ token, patients }: { token: string; patients: PatientSummary[] }) {
  return (
    <section className="admin-page consultation-page">
      <DictationTool token={token} patients={patients} />
      <Panel title="Patients disponibles" subtitle="Selectionnez le dossier dans la consultation.">
        <PatientList patients={patients} />
      </Panel>
    </section>
  );
}

function FinancePage({ token, finance, reminders, platform }: { token: string; finance: FinanceSummary | null; reminders: Reminder[]; platform: PlatformStats | null }) {
  return (
    <div className="admin-page">
      <section className="metrics finance-metrics">
        <Metric icon={<CreditCard />} label="Encaisse" value={money(finance?.revenueCents)} detail={`${finance?.invoices ?? 0} facture(s)`} />
        <Metric icon={<CreditCard />} label="Impayes" value={money(finance?.unpaidCents)} detail="A relancer" />
        <Metric icon={<CreditCard />} label="Paiements cash" value={money(finance?.payments.cashCents)} detail="Recettes du mois" />
        <Metric icon={<CreditCard />} label="Paiements carte" value={money(finance?.payments.cardCents)} detail="Recettes du mois" />
      </section>
      <section className="admin-grid finance-grid">
        <RevenuePanel />
        <InvoiceTool token={token} />
      </section>
      <section className="admin-grid finance-grid">
        <OperationsPanel reminders={reminders} platform={platform} />
      </section>
    </div>
  );
}

function RevenuePanel() {
  return (
    <Panel title="Activite et facturation" subtitle="Suivi mensuel du cabinet.">
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueSeries}>
            <defs><linearGradient id="income" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#14765d" stopOpacity={0.32} /><stop offset="95%" stopColor="#14765d" stopOpacity={0.04} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#d7e0da" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#14765d" fill="url(#income)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function OperationsPanel({ reminders, platform }: { reminders: Reminder[]; platform: PlatformStats | null }) {
  return (
    <Panel title="Rappels et securite" subtitle="Evenements operationnels.">
      <div className="reminders">
        {reminders.map((reminder) => <article key={reminder.id}><BellRing /><strong>{reminder.message}</strong><span>{reminder.channel} - {reminder.status} - {reminder.target}</span></article>)}
        {platform ? <article><ShieldCheck /><strong>{platform.clinics} cabinet actif, {platform.doctors} medecin</strong><span>MRR {money(platform.monthlyRecurringRevenueCents)} - {platform.auditEvents24h} audits / 24h</span></article> : null}
      </div>
    </Panel>
  );
}

function PatientList({ patients }: { patients: PatientSummary[] }) {
  if (!patients.length) return <p className="empty">Aucun patient trouve.</p>;

  return (
    <div className="patient-list">
      {patients.map((patient) => (
        <article key={patient.id}>
          <strong>{patient.firstName} {patient.lastName}</strong>
          <span>{patient.phone}</span>
          <small>{patient.allergies.join(", ") || "Aucune allergie signalee"}</small>
        </article>
      ))}
    </div>
  );
}

function CreateAppointment({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [form, setForm] = useState({ patientName: "", date: tomorrowDate(), time: "10:00", reason: "Consultation", status: "CONFIRMED" as AppointmentStatus });
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = new Date(`${form.date}T${form.time}`);
    try {
      await api("/api/appointments", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({ patientName: form.patientName, startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(), status: form.status, reason: form.reason })
      });
      setMessage("Rendez-vous ajoute.");
      setForm((current) => ({ ...current, patientName: "" }));
      onCreated();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return <Panel title="Nouveau rendez-vous" subtitle="Creation directe par l'equipe."><form className="stack-form" onSubmit={submit}><label>Patient<input required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} /></label><div className="form-pair"><label>Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Heure<input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Motif<input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><label>Etat<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}><option>CONFIRMED</option><option>PENDING</option><option>COMPLETED</option><option>CANCELLED</option></select></label><button><CalendarCheck /> Ajouter</button>{message ? <output>{message}</output> : null}</form></Panel>;
}

function CreatePatient({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", allergies: "", chronicConditions: "" });
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/patients", {
        ...auth(token),
        method: "POST",
        body: JSON.stringify({ ...form, allergies: csv(form.allergies), chronicConditions: csv(form.chronicConditions) })
      });
      setMessage("Patient ajoute.");
      setForm({ firstName: "", lastName: "", phone: "", allergies: "", chronicConditions: "" });
      onCreated();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return <Panel title="Nouveau patient" subtitle="Coordonnees essentielles."><form className="stack-form" onSubmit={submit}><div className="form-pair"><label>Prenom<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label><label>Nom<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label></div><label>Telephone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Allergies<input value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })} placeholder="Penicilline, AINS" /></label><label>Pathologies chroniques<input value={form.chronicConditions} onChange={(event) => setForm({ ...form, chronicConditions: event.target.value })} /></label><button><UserRoundPlus /> Creer</button>{message ? <output>{message}</output> : null}</form></Panel>;
}

function DictationTool({ token, patients }: { token: string; patients: PatientSummary[] }) {
  const [patientId, setPatientId] = useState("");
  const [rawDictation, setRawDictation] = useState("Patient avec douleur abdominale et fievre depuis 3 jours.");
  const [note, setNote] = useState<StructuredMedicalNote | null>(null);
  const [consultation, setConsultation] = useState("");

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
  }, [patientId, patients]);

  async function structure() {
    try {
      setNote(await api<StructuredMedicalNote>("/api/ai/structure-dictation", { ...auth(token), method: "POST", body: JSON.stringify({ rawText: rawDictation }) }));
    } catch (error) {
      setConsultation(readError(error));
    }
  }

  async function saveConsultation() {
    try {
      const saved = await api<{ id: string }>("/api/consultations/from-dictation", { ...auth(token), method: "POST", body: JSON.stringify({ patientId, rawDictation }) });
      setConsultation(`Consultation ${saved.id} creee.`);
    } catch (error) {
      setConsultation(readError(error));
    }
  }

  return <Panel title="Consultation IA" subtitle="Structuration de dictee et note medicale."><div className="stack-form"><label>Patient<select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select></label><label>Dictee<textarea value={rawDictation} onChange={(event) => setRawDictation(event.target.value)} /></label><div className="inline-actions"><button type="button" onClick={structure}><Activity /> Structurer</button><button type="button" onClick={saveConsultation} disabled={!patientId}><FileText /> Enregistrer</button></div>{note ? <article className="note"><strong>{note.reason}</strong><span>{note.symptoms.join(" | ")}</span><small>{note.treatmentPlan}</small></article> : null}{consultation ? <output>{consultation}</output> : null}</div></Panel>;
}

function InvoiceTool({ token }: { token: string }) {
  const [patientName, setPatientName] = useState("Amira Ben Youssef");
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

  return <Panel title="Facture" subtitle="Apercu avant generation PDF."><form className="stack-form" onSubmit={preview}><label>Patient<input value={patientName} onChange={(event) => setPatientName(event.target.value)} /></label><label>Montant TND<input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button><CreditCard /> Previsualiser</button>{invoice ? <article className="invoice"><strong>{invoice.number}</strong><span>{invoice.patientName}</span><b>{money(invoice.amountCents)}</b></article> : null}{error ? <output>{error}</output> : null}</form></Panel>;
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

function Status({ value }: { value: AppointmentStatus }) {
  return <em className={`status ${value.toLowerCase()}`}>{({ CONFIRMED: "Confirme", PENDING: "En attente", CANCELLED: "Annule", COMPLETED: "Termine" } as const)[value]}</em>;
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

function money(cents = 0) {
  return `${(cents / 100).toLocaleString("fr-FR")} TND`;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function currentAdminPage(): AdminPage {
  const path = window.location.pathname.replace(/\/+$/, "");
  const legacyHash = window.location.hash.replace("#", "");

  if (path === "/admin/agenda" || legacyHash === "agenda") return "agenda";
  if (path === "/admin/patients" || legacyHash === "patients") return "patients";
  if (path === "/admin/consultations" || legacyHash === "consultation") return "consultations";
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
