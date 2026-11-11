import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createJobStore, type Job, type JobKind, type JobSpec, type JobStore, type StartResult } from '../services/jobs/jobStore.ts';

// Un único almacén para toda la app: los trabajos sobreviven a la navegación (cerrar una pantalla no los cancela).
const store: JobStore = createJobStore();

interface JobsContextValue {
  jobs: Job[];
  startJob: <T>(spec: JobSpec<T>) => StartResult;
  cancelJob: (id: string) => void;
  markJobSeen: (id: string) => void;
  markAnnounceSeen: (id: string) => void;
  dismissJob: (id: string) => void;
  getRunningJob: (kind: JobKind) => Job | undefined;
  /** Trabajo cuya pantalla de espera está visible ahora: la capa de avisos no lo repite. */
  foregroundJobId: string | null;
  setForegroundJobId: (id: string | null) => void;
}

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const jobs = useSyncExternalStore(store.subscribe, store.getJobs, store.getJobs);
  const [foregroundJobId, setForegroundJobId] = useState<string | null>(null);

  const value = useMemo<JobsContextValue>(() => ({
    jobs,
    startJob: store.start,
    cancelJob: store.cancel,
    markJobSeen: store.markSeen,
    markAnnounceSeen: store.markAnnounceSeen,
    dismissJob: store.dismiss,
    getRunningJob: store.getRunning,
    foregroundJobId,
    setForegroundJobId,
  }), [jobs, foregroundJobId]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};

export const useJobs = (): JobsContextValue => {
  const context = useContext(JobsContext);
  if (!context) throw new Error('useJobs debe utilizarse dentro de un JobsProvider');
  return context;
};

/** Trabajo por id (undefined si no existe o ya se descartó). */
export const useJob = (jobId?: string | null): Job | undefined => {
  const { jobs } = useJobs();
  return useMemo(() => (jobId ? jobs.find((job) => job.id === jobId) : undefined), [jobs, jobId]);
};

/** Marca el trabajo como "en primer plano" mientras su pantalla esté visible. */
export const useForegroundJob = (jobId?: string | null): void => {
  const { setForegroundJobId } = useJobs();
  const stableSet = useCallback(setForegroundJobId, [setForegroundJobId]);
  useEffect(() => {
    if (!jobId) return undefined;
    stableSet(jobId);
    return () => stableSet(null);
  }, [jobId, stableSet]);
};
