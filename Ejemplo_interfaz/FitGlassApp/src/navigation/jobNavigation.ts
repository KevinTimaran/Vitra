import { navigationRef } from './navigationRef';
import {
  routeForFreePlay,
  routeForGame,
  routeForJobResult,
  routeForOpenJob,
  routeForRetry,
  routeForTryOnGarment,
  type AppRoute,
  type JobLike,
} from './jobRoutes.ts';

/** Navega con la referencia global. Devuelve false si el navegador aún no está listo. */
export const navigateTo = (route: AppRoute): boolean => {
  if (!navigationRef.isReady()) return false;
  (navigationRef.navigate as (name: string, params?: unknown) => void)(route.name, route.params);
  return true;
};

export const openJob = (job: JobLike) => navigateTo(routeForOpenJob(job));
export const viewJobResult = (job: JobLike) => navigateTo(routeForJobResult(job));
export const retryJob = (job: JobLike) => navigateTo(routeForRetry(job));
export const openGame = (jobId: string) => navigateTo(routeForGame(jobId));
export const tryOnGarment = (garment: unknown) => navigateTo(routeForTryOnGarment(garment));
export const openFreePlay = () => navigateTo(routeForFreePlay());
