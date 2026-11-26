import { ShieldAlert, PowerOff } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ACCESS_TEXT, type AccessKind } from '@/lib/access';
import { siteHref } from '@/lib/siteHref';

/** Pantalla de acceso denegado por red (403) o de panel deshabilitado (503); no vuelve al login. */
export default function AccessBlockedPage({ kind, message }: { kind: AccessKind; message?: string }) {
  const t = ACCESS_TEXT[kind];
  const Icon = kind === 'forbidden' ? ShieldAlert : PowerOff;
  return (
    <div className="grid min-h-screen place-items-center bg-side px-4 py-8">
      <main className="w-full max-w-[420px]">
        <div className="mb-5 flex justify-center">
          <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="ISPMAX" width={168} height={88} className="h-auto w-[168px] dark:hidden" />
          <img src={`${import.meta.env.BASE_URL}logo-oscuro.webp`} alt="ISPMAX" width={168} height={88} className="hidden h-auto w-[168px] dark:block" />
        </div>
        <Card as="div" className="p-6"><div role="alert" data-access={kind}>
          <div className="mb-3 grid size-10 place-items-center rounded-full bg-subtle text-ink-2"><Icon size={20} aria-hidden="true" /></div>
          <h1 className="text-lg font-semibold">{t.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">{t.text}</p>
          {message && message !== t.title && <p className="mt-2 text-[12.5px] text-ink-3">{message}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => window.location.reload()}>Reintentar</Button>
            <Button asChild variant="ghost"><a href={siteHref()} target="_blank" rel="noopener noreferrer">Ver el manual</a></Button>
          </div>
        </div></Card>
      </main>
    </div>
  );
}
