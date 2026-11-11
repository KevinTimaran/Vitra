// Sondeo de tareas del backend (start -> status/{id}) sin dependencias de React Native, para poder probarlo con node.
// Reemplaza los bucles duplicados de generateTryOn / generateAvatar y elimina dos problemas:
//  - ya NO se relanza el pipeline por la ruta síncrona al agotar el sondeo (doble cobro de Replicate/Tripo);
//  - ya NO se recupera "el último modelo del servidor" (podía ser de otra prenda u otro usuario).

export type TaskErrorKind = 'start_failed' | 'task_failed' | 'task_not_found' | 'timeout' | 'network' | 'aborted';

export class TaskError extends Error {
  kind: TaskErrorKind;
  status?: number;
  /** Código estable del backend (p. ej. "image_no_person"). */
  code?: string;

  constructor(message: string, kind: TaskErrorKind, status?: number, code?: string) {
    super(message);
    this.name = 'TaskError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export interface RunTaskOptions {
  baseUrl: string;
  startPath: string;
  body: unknown;
  statusPath: (taskId: string) => string;
  headers?: Record<string, string>;
  intervalMs: number;
  maxAttempts: number;
  /** Llamado con cada respuesta de estado (para progreso en la UI). */
  onStatus?: (status: Record<string, any>) => void;
  onTaskId?: (taskId: string) => void;
  signal?: AbortSignal;
  /** Un estado "completed" solo es válido si trae esta clave (p. ej. 'model_3d_url'). */
  resultKey?: string;
  /** Fallos de red consecutivos tolerados antes de rendirse (el móvil puede perder la señal un momento). */
  maxConsecutiveNetworkErrors?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const defaultSleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new TaskError('Operación cancelada.', 'aborted'));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new TaskError('Operación cancelada.', 'aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const readDetail = async (response: Response, fallback: string): Promise<{ message: string; code?: string }> => {
  try {
    const json = await response.json();
    const detail = json?.detail ?? json?.error;
    if (detail) return { message: typeof detail === 'string' ? detail : JSON.stringify(detail), code: json?.code };
  } catch {
    // respuesta no JSON (p. ej. HTML de un proxy)
  }
  return { message: fallback };
};

export async function runTask(options: RunTaskOptions): Promise<Record<string, any>> {
  const doFetch = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const maxNetErrors = options.maxConsecutiveNetworkErrors ?? 12;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers ?? {}) };

  let startResponse: Response;
  try {
    startResponse = await doFetch(`${options.baseUrl}${options.startPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError' || options.signal?.aborted) throw new TaskError('Operación cancelada.', 'aborted');
    throw new TaskError(error?.message || 'No se pudo conectar con el servidor.', 'network');
  }

  if (!startResponse.ok) {
    const detail = await readDetail(startResponse, `Error al iniciar la tarea (HTTP ${startResponse.status})`);
    throw new TaskError(detail.message, 'start_failed', startResponse.status, detail.code);
  }

  const started = await startResponse.json();
  const taskId: string | undefined = started?.task_id;
  if (!taskId) throw new TaskError('El servidor no devolvió el identificador de la tarea.', 'start_failed');
  options.onTaskId?.(taskId);

  let consecutiveNetworkErrors = 0;
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    await sleep(options.intervalMs, options.signal);

    let statusResponse: Response;
    try {
      statusResponse = await doFetch(`${options.baseUrl}${options.statusPath(taskId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...(options.headers ?? {}) },
        signal: options.signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError' || options.signal?.aborted) throw new TaskError('Operación cancelada.', 'aborted');
      consecutiveNetworkErrors += 1;
      if (consecutiveNetworkErrors >= maxNetErrors) {
        throw new TaskError('Se perdió la conexión con el servidor.', 'network');
      }
      continue;
    }

    if (statusResponse.status === 404) {
      throw new TaskError('La tarea ya no existe en el servidor (¿se reinició?).', 'task_not_found', 404);
    }
    if (!statusResponse.ok) {
      consecutiveNetworkErrors += 1;
      if (consecutiveNetworkErrors >= maxNetErrors) {
        throw new TaskError(`El servidor respondió HTTP ${statusResponse.status} repetidamente.`, 'network', statusResponse.status);
      }
      continue;
    }
    consecutiveNetworkErrors = 0;

    const status = await statusResponse.json();
    options.onStatus?.(status);

    if (status?.status === 'failed') {
      throw new TaskError(String(status.error || 'La generación 3D finalizó con error.'), 'task_failed');
    }
    if (status?.status === 'completed') {
      if (!options.resultKey || status[options.resultKey]) return status;
      throw new TaskError('La tarea terminó sin devolver el modelo 3D.', 'task_failed');
    }
  }

  throw new TaskError('La generación tardó demasiado. Inténtalo de nuevo.', 'timeout');
}
