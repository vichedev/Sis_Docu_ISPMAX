/** Une clases de Tailwind descartando las vacías: cn('a', cond && 'b'). */
export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
