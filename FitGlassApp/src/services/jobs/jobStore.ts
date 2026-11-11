// Almacén de trabajos de generación 3D, independiente de React y de las pantallas.
// Un trabajo vive aquí (no en el componente): cerrar la pantalla NO lo cancela; al terminar, el store ejecuta
// `onSuccess` exactamente una vez (p. ej. guardar la prenda en el armario) aunque la pantalla ya no exista.
import { friendlyError, type FriendlyError } from './jobErrors.ts';

export type JobKind = 'garment' | 'cascade' | 'avatar';
export type JobStatus = 'running' | 'done' | 'failed' | 'cancelled';

export interface JobProgress {
  progress?: number;
  /** Fase lógica (la pantalla la traduce a texto): connecting | analyzing | vton | tripo | optimizing | finalizing */
  phase?: string;
  detail?: string;
  /** Datos libres de la fase (p. ej. índice de la prenda actual en la cascada). */
  meta?: Record<string, any>;
}

export interface Job {
  id: string;
  kind: JobKind;
  title: string;
  thumbnailUri?: string;
  status: JobStatus;
  progress: number;
  phase?: string;
  detail?: string;
  meta?: Record<string, any>;
  result?: any;
  error?: FriendlyError;
  startedAt: number;
  finishedAt?: number;
  /** true cuando el usuario ya vio el resultado (en su pantalla o en la tarjeta); evita avisar dos veces. */
  seen: boolean;
  /** Mensaje de bienvenida de la generación (se muestra UNA vez: "puedes jugar mientras esperas"). */
  announce?: { title: string; message: string };
  announceSeen: boolean;
}

export interface RunContext {
  signal: AbortSignal;
  report: (progress: JobProgress) => void;
}

export interface JobSpec<T = any> {
  kind: JobKind;
  title: string;
  thumbnailUri?: string;
  /** Si se indica, la capa de avisos muestra una vez una tarjeta explicando que se puede jugar o seguir usando la app. */
  announce?: { title: string; message: string };
  run: (context: RunContext) => Promise<T>;
  /** Se ejecuta UNA vez al terminar bien, dentro del store (no depende de ninguna pantalla). */
  onSuccess?: (result: T) => void | Promise<void>;
}

export type StartResult = { ok: true; job: Job } | { ok: false; reason: 'busy'; job: Job };

type Listener = () => void;

export interface JobStore {
  getJobs: () => Job[];
  getJob: (id: string) => Job | undefined;
  getRunning: (kind: JobKind) => Job | undefined;
  subscribe: (listener: Listener) => () => void;
  start: <T>(spec: JobSpec<T>) => StartResult;
  cancel: (id: string) => void;
  markSeen: (id: string) => void;
  markAnnounceSeen: (id: string) => void;
  dismiss: (id: string) => void;
}

const MAX_FINISHED_JOBS = 20;

export function createJobStore(now: () => number = Date.now): JobStore {
  let jobs: Job[] = [];
  const controllers = new Map<string, AbortController>();
  const listeners = new Set<Listener>();
  let counter = 0;

  const emit = () => listeners.forEach((listener) => listener());
  const update = (id: string, patch: Partial<Job>) => {
    let changed = false;
    jobs = jobs.map((job) => {
      if (job.id !== id) return job;
      changed = true;
      return { ...job, ...patch };
    });
    if (changed) emit();
  };

  const trimFinished = () => {
    const finished = jobs.filter((job) => job.status !== 'running');
    if (finished.length > MAX_FINISHED_JOBS) {
      const drop = new Set(finished.slice(0, finished.length - MAX_FINISHED_JOBS).map((job) => job.id));
      jobs = jobs.filter((job) => !drop.has(job.id));
    }
  };

  const getRunning = (kind: JobKind) => jobs.find((job) => job.kind === kind && job.status === 'running');

  const start = <T,>(spec: JobSpec<T>): StartResult => {
    const running = getRunning(spec.kind);
    if (running) return { ok: false, reason: 'busy', job: running };

    counter += 1;
    const id = `job-${now()}-${counter}`;
    const controller = new AbortController();
    controllers.set(id, controller);

    const job: Job = {
      id,
      kind: spec.kind,
      title: spec.title,
      thumbnailUri: spec.thumbnailUri,
      status: 'running',
      progress: 0.05,
      phase: 'connecting',
      startedAt: now(),
      seen: false,
      announce: spec.announce,
      announceSeen: !spec.announce,
    };
    jobs = [...jobs, job];
    emit();

    void (async () => {
      try {
        const result = await spec.run({
          signal: controller.signal,
          report: (p) => {
            const current = jobs.find((j) => j.id === id);
            if (!current || current.status !== 'running') return;
            update(id, {
              progress: typeof p.progress === 'number' ? Math.max(current.progress, Math.min(p.progress, 0.99)) : current.progress,
              phase: p.phase ?? current.phase,
              detail: p.detail ?? current.detail,
              meta: p.meta ? { ...(current.meta ?? {}), ...p.meta } : current.meta,
            });
          },
        });

        const current = jobs.find((j) => j.id === id);
        if (!current || current.status !== 'running') return; // cancelado mientras terminaba

        try {
          await spec.onSuccess?.(result);
        } catch (error) {
          update(id, { status: 'failed', error: friendlyError(error), finishedAt: now() });
          return;
        }
        update(id, { status: 'done', progress: 1, result, finishedAt: now() });
      } catch (error: any) {
        const current = jobs.find((j) => j.id === id);
        if (!current || current.status !== 'running') return;
        if (controller.signal.aborted || error?.kind === 'aborted') {
          update(id, { status: 'cancelled', finishedAt: now(), seen: true });
        } else {
          update(id, { status: 'failed', error: friendlyError(error), finishedAt: now() });
        }
      } finally {
        controllers.delete(id);
        trimFinished();
        emit();
      }
    })();

    return { ok: true, job };
  };

  return {
    getJobs: () => jobs,
    getJob: (id) => jobs.find((job) => job.id === id),
    getRunning,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    cancel: (id) => {
      const controller = controllers.get(id);
      const job = jobs.find((j) => j.id === id);
      if (job && job.status === 'running') {
        update(id, { status: 'cancelled', finishedAt: now(), seen: true });
        controller?.abort();
      }
    },
    markSeen: (id) => update(id, { seen: true }),
    markAnnounceSeen: (id) => update(id, { announceSeen: true }),
    dismiss: (id) => {
      jobs = jobs.filter((job) => job.id !== id || job.status === 'running');
      emit();
    },
  };
}
