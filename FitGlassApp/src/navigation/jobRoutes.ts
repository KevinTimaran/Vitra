// Rutas de navegación asociadas a los trabajos de generación y al probador. Lógica PURA (sin React Native):
// se prueba con node (src/navigation/__tests__/jobRoutes.test.mjs).

export interface AppRoute {
  name: string;
  params?: Record<string, unknown>;
}

export interface JobLike {
  id: string;
  kind: 'garment' | 'cascade' | 'avatar';
}

const tab = (screen: string, params?: Record<string, unknown>): AppRoute => ({
  name: 'MainTabs',
  params: { screen, ...(params ? { params } : {}) },
});

/** Reabrir la pantalla de espera de un trabajo en marcha (píldora de progreso). */
export const routeForOpenJob = (job: JobLike): AppRoute => {
  if (job.kind === 'garment') return { name: 'GarmentProcessing', params: { jobId: job.id } };
  if (job.kind === 'cascade') return tab('FittingRoom');
  return { name: 'BodyProfile' };
};

/** Ir al resultado de un trabajo terminado (tarjeta "ya está lista"). */
export const routeForJobResult = (job: JobLike): AppRoute =>
  // El avatar y el look se ven en el Probador (el avatar nuevo ya es el modelo base); la prenda, en el Armario.
  tab(job.kind === 'garment' ? 'Wardrobe' : 'FittingRoom');

/** Reintentar tras un fallo: volver al punto donde se inicia ese tipo de generación. */
export const routeForRetry = (job: JobLike): AppRoute => {
  if (job.kind === 'garment') return { name: 'AddGarment' };
  if (job.kind === 'cascade') return tab('FittingRoom');
  return { name: 'BodyProfile' };
};

/** Pantalla aparte del juego para un trabajo en marcha. */
export const routeForGame = (jobId: string): AppRoute => ({ name: 'WaitingGame', params: { jobId } });

/**
 * "Probar en mi Avatar 3D": lleva al probador con SOLO la prenda seleccionada. No se envían `model_3d_url` ni
 * `image_2d_url`: el probador los aplicaría como modelo activo y sustituiría al avatar del usuario.
 */
export const routeForTryOnGarment = (garment: unknown): AppRoute => tab('FittingRoom', { selectedGarment: garment });

/** Juego libre (desde Ajustes): sin trabajo asociado. */
export const routeForFreePlay = (): AppRoute => ({ name: 'WaitingGame', params: {} });
