export interface Resultado {
  ruta: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  modulo: string;
}
export declare const TIPOS: Record<string, string>;
export declare function cargarIndice(): Promise<unknown>;
export declare function resultados(query: string, limit?: number): Promise<Resultado[]>;
export declare function afterSearch(query: string, searchResult: unknown[]): Promise<void>;
