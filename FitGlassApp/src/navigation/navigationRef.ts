import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Referencia global al navegador: permite navegar desde sitios que NO son pantallas de la pila (modales,
// la capa de avisos, servicios). Los <Modal> de React Native no heredan `navigation`, por eso el botón
// "Probar en mi Avatar 3D" no funcionaba desde Inicio.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
