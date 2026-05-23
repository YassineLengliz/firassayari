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
  SmilePlus,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

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
    reason: "Bilan dentaire"
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
      setMessage("Votre demande est enregistree. Le cabinet dentaire confirmera le rendez-vous.");
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
          <strong>Dr Firas Sayari<small>Dentiste</small></strong>
        </a>
        <nav aria-label="Navigation publique">
          <a href="#rdv">Rendez-vous</a>
          <a href="#soins">Soins</a>
          <a href="#cabinet">Cabinet</a>
          <a className="nav-command" href="/admin"><ShieldCheck /> Admin</a>
        </nav>
      </header>

      <section className="hero">
        <img src="/images/firas-new-hero.png" alt="Dr Firas Sayari accueille un patient dans son cabinet dentaire" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">Cabinet dentaire</p>
          <h1>Un sourire soigne avec precision.</h1>
          <p className="hero-lead"><strong>Dr Firas Sayari</strong>, dentiste, vous accueille pour des soins attentifs, expliques et confortables.</p>
          <div className="hero-actions">
            <a href="#rdv"><CalendarCheck /> Prendre rendez-vous</a>
            <a href="#soins" className="quiet-action"><SmilePlus /> Decouvrir les soins</a>
          </div>
          <div className="hero-points" aria-label="Engagements du cabinet">
            <span><ShieldCheck /> Soins rassurants</span>
            <span><Sparkles /> Hygiene rigoureuse</span>
            <span><CalendarCheck /> Reservation rapide</span>
          </div>
        </div>

        <form id="rdv" className="booking-tool" onSubmit={requestAppointment}>
          <div>
            <p>Rendez-vous dentaire</p>
            <strong>Reservez votre visite</strong>
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
            <select required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
              <option>Bilan dentaire</option>
              <option>Detartrage</option>
              <option>Douleur ou urgence</option>
              <option>Soins conservateurs</option>
              <option>Esthetique du sourire</option>
            </select>
          </label>
          <button disabled={requestState === "sending"}><ClipboardPlus /> {requestState === "sending" ? "Envoi..." : "Demander le RDV"}</button>
          {message ? <output className={requestState}>{message}</output> : null}
        </form>
      </section>

      <section id="soins" className="cabinet-band">
        <div>
          <p className="eyebrow">Nos soins</p>
          <h2>La sante bucco-dentaire, a chaque etape.</h2>
          <p className="band-intro">Une approche claire et douce, de la prevention au soulagement d'une douleur.</p>
        </div>
        <Feature icon={<SmilePlus />} title="Bilan & prevention" text="Controle dentaire, conseils personnalises et detartrage pour preserver votre sourire." />
        <Feature icon={<Sparkles />} title="Soins du sourire" text="Traitement des caries et solutions esthetiques discutees avec clarte." />
        <Feature icon={<CalendarCheck />} title="Douleur & urgence" text="Demandez rapidement un creneau en cas de douleur ou d'inconfort dentaire." />
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
      <a className="doctor-mark" href="/"><span>FS</span><strong>Dr Firas Sayari<small>Dentiste</small></strong></a>
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
        <a className="doctor-mark" href="/"><span>FS</span><strong>Dr Firas Sayari<small>Dentiste</small></strong></a>
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
        {page === "agenda" ? <AgendaPage appointments={appointments} patients={patients} token={token} onChanged={() => setRefreshId((value) => value + 1)} /> : null}
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

function AgendaPage({ appointments, patients, token, onChanged }: { appointments: AppointmentSummary[]; patients: PatientSummary[]; token: string; onChanged: () => void }) {
  const [draftDate, setDraftDate] = useState(tomorrowDate());
  const [draftTime, setDraftTime] = useState("10:00");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedId) ?? null;

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

  function pickDate(info: DateClickArg) {
    setDraftDate(dateInput(info.date));
    setDraftTime(timeInput(info.date));
    setMessage("Creneau choisi pour le nouveau rendez-vous.");
  }

  function selectAppointment(info: EventClickArg) {
    setSelectedId(info.event.id);
  }

  return (
    <section className="admin-page agenda-page">
      <Panel title="Agenda du cabinet" subtitle="Demandes patients et rendez-vous internes.">
        <div className="cabinet-calendar">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
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
            dateClick={pickDate}
            eventClick={selectAppointment}
            eventDrop={moveAppointment}
            editable
            eventOverlap={false}
            eventDurationEditable={false}
            slotEventOverlap={false}
            events={appointments.map((appointment) => ({
              id: appointment.id,
              title: appointment.patientName,
              start: appointment.startsAt,
              end: appointment.endsAt,
              className: `calendar-event ${appointment.status.toLowerCase()}`
            }))}
          />
        </div>
        {message ? <output>{message}</output> : null}
      </Panel>
      <section className="agenda-side">
        <CreateAppointment token={token} onCreated={onChanged} selectedDate={draftDate} selectedTime={draftTime} />
        <AppointmentDetails appointment={selectedAppointment} patients={patients} token={token} onRemoved={onChanged} />
      </section>
    </section>
  );
}

function AppointmentDetails({ appointment, patients, token, onRemoved }: { appointment: AppointmentSummary | null; patients: PatientSummary[]; token: string; onRemoved: () => void }) {
  const [message, setMessage] = useState("");
  const patient = appointment ? matchingPatient(appointment.patientName, patients) : null;

  useEffect(() => setMessage(""), [appointment?.id]);

  async function remove() {
    if (!appointment) return;

    try {
      await api(`/api/appointments/${appointment.id}`, { ...auth(token), method: "DELETE" });
      setMessage("Rendez-vous supprime.");
      onRemoved();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  return (
    <Panel title="Rendez-vous selectionne" subtitle="Dossier du rendez-vous et informations patient.">
      {!appointment ? <p className="empty">Aucun rendez-vous selectionne.</p> : (
        <div className="appointment-details">
          <strong>{appointment.patientName}</strong>
          <time>{appointmentDateTime(appointment)}</time>
          <span>{appointment.reason}</span>
          <Status value={appointment.status} />
          {patient ? (
            <article>
              <p>Dossier patient</p>
              <strong>{patient.firstName} {patient.lastName}</strong>
              <span>{patient.phone}</span>
              <small>Allergies: {patient.allergies.join(", ") || "Aucune signalee"}</small>
              <small>Pathologies: {patient.chronicConditions.join(", ") || "Aucune signalee"}</small>
            </article>
          ) : <p className="empty">Aucun dossier patient correspondant.</p>}
          <button className="danger-command" type="button" onClick={remove}><Trash2 /> Supprimer</button>
        </div>
      )}
      {message ? <output>{message}</output> : null}
    </Panel>
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
      <p className="empty">Aucune donnee de facturation disponible.</p>
    </Panel>
  );
}

function OperationsPanel({ reminders, platform }: { reminders: Reminder[]; platform: PlatformStats | null }) {
  return (
    <Panel title="Rappels et securite" subtitle="Evenements operationnels.">
      <div className="reminders">
        {reminders.map((reminder) => <article key={reminder.id}><BellRing /><strong>{reminder.message}</strong><span>{reminder.channel} - {reminder.status} - {reminder.target}</span></article>)}
        {platform ? <article><ShieldCheck /><strong>{platform.clinics} cabinet actif, {platform.doctors} dentiste</strong><span>MRR {money(platform.monthlyRecurringRevenueCents)} - {platform.auditEvents24h} audits / 24h</span></article> : null}
        {!reminders.length && !platform ? <p className="empty">Aucun rappel operationnel.</p> : null}
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
  const [rawDictation, setRawDictation] = useState("");
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

  return <Panel title="Consultation IA" subtitle="Structuration de dictee et note dentaire."><div className="stack-form"><label>Patient<select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select></label><label>Dictee<textarea value={rawDictation} onChange={(event) => setRawDictation(event.target.value)} /></label><div className="inline-actions"><button type="button" onClick={structure}><Activity /> Structurer</button><button type="button" onClick={saveConsultation} disabled={!patientId}><FileText /> Enregistrer</button></div>{note ? <article className="note"><strong>{note.reason}</strong><span>{note.symptoms.join(" | ")}</span><small>{note.treatmentPlan}</small></article> : null}{consultation ? <output>{consultation}</output> : null}</div></Panel>;
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

  return <Panel title="Facture" subtitle="Apercu avant generation PDF."><form className="stack-form" onSubmit={preview}><label>Patient<input required value={patientName} onChange={(event) => setPatientName(event.target.value)} /></label><label>Montant TND<input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button><CreditCard /> Previsualiser</button>{invoice ? <article className="invoice"><strong>{invoice.number}</strong><span>{invoice.patientName}</span><b>{money(invoice.amountCents)}</b></article> : null}{error ? <output>{error}</output> : null}</form></Panel>;
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

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function appointmentDateTime(appointment: AppointmentSummary) {
  const startsAt = new Date(appointment.startsAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const endsAt = new Date(appointment.endsAt).toLocaleTimeString("fr-FR", { timeStyle: "short" });
  return `${startsAt} - ${endsAt}`;
}

function matchingPatient(patientName: string, patients: PatientSummary[]) {
  const name = normalize(patientName);
  return patients.find((patient) => name === normalize(`${patient.firstName} ${patient.lastName}`)) ?? null;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
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
