import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator para marcar rutas que NO necesitan autenticación.
 * Ejemplo: el endpoint que expone el estado del overlay para OBS.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
