"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, ShieldCheck, ShieldQuestion, SkipForward } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { api } from "@/lib/jd/api";
import type { CaptchaJob, CaptchaSkipType } from "@/lib/jd/types";
import { keys, useAction, useCaptchas } from "@/lib/queries";

import { Button } from "../ui/button";
import { Input } from "../ui/field";
import { Menu } from "../ui/menu";
import { Badge, Card, Empty, PageHeader, Spinner } from "../ui/misc";

// Challenges answered with a token from the hoster's own widget: they cannot be typed in from here
const TOKEN_CAPTCHAS =
  /recaptcha|hcaptcha|keycaptcha|turnstile|cutcaptcha|solvemedia|confidenttrust/i;

const SKIPS: { type: CaptchaSkipType; label: string }[] = [
  { type: "SINGLE", label: "Saltar este" },
  { type: "BLOCK_HOSTER", label: "Saltar todos de este host" },
  { type: "BLOCK_PACKAGE", label: "Saltar todos de este paquete" },
  { type: "BLOCK_ALL_CAPTCHAS", label: "Saltar todos los captchas" },
  { type: "REFRESH", label: "Pedir otro" },
];

function Countdown({ created, timeout }: { created?: number; timeout?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!created || !timeout || timeout <= 0) return null;
  const left = Math.max(0, Math.round((created + timeout - now) / 1000));
  return <Badge tone={left < 30 ? "danger" : "warning"}>{left}s</Badge>;
}

function CaptchaCard({ job }: { job: CaptchaJob }) {
  const [answer, setAnswer] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const run = useAction();
  const tokenBased = TOKEN_CAPTCHAS.test(job.type);
  const { data: image, isPending } = useQuery({
    queryKey: ["captchas", "image", job.id],
    queryFn: () => api.captcha.image(job.id),
    enabled: !tokenBased,
    staleTime: Infinity,
  });

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{job.hoster}</p>
          <p className="text-xs text-muted">{job.type}</p>
        </div>
        <Countdown created={job.created} timeout={job.timeout} />
      </div>
      {job.explain && <p className="text-sm text-muted">{job.explain}</p>}

      {tokenBased ? (
        <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Este tipo de captcha se resuelve en la página del host y no se puede contestar desde aquí.
          Sáltalo, o configura un servicio de captchas (9kw, 2captcha…) en Ajustes avanzados.
        </p>
      ) : (
        <>
          <div className="flex min-h-24 items-center justify-center rounded-2xl bg-white p-3">
            {isPending ? (
              <Spinner className="h-5 w-5 text-slate-500" />
            ) : image ? (
              <img src={image} alt="Captcha" className="max-h-48 max-w-full" />
            ) : null}
          </div>
          <form
            className="flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!answer.trim()) return;
              await run(() => api.captcha.solve(job.id, answer.trim()), {
                refresh: [keys.captchas],
                success: "Respuesta enviada",
              });
            }}
          >
            <Input
              autoFocus
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Escribe lo que ves"
              aria-label="Respuesta del captcha"
              autoComplete="off"
            />
            <Button type="submit" variant="primary" Icon={ShieldCheck} disabled={!answer.trim()}>
              Enviar
            </Button>
          </form>
        </>
      )}

      <div>
        <Button
          size="sm"
          Icon={SkipForward}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setMenu({ x: box.left, y: box.bottom + 6 });
          }}
        >
          Saltar…
        </Button>
      </div>
      {menu && (
        <Menu
          at={menu}
          onClose={() => setMenu(null)}
          items={SKIPS.map(({ type, label }) => ({
            label,
            onSelect: () => run(() => api.captcha.skip(job.id, type), { refresh: [keys.captchas] }),
          }))}
        />
      )}
    </Card>
  );
}

export function CaptchasView() {
  const { data: captchas, isPending } = useCaptchas();
  // The browser's answer, until the button asks again
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const current = useSyncExternalStore(
    () => () => {},
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "unsupported",
  );
  const permission = asked ?? current;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Captchas"
        subtitle="Los que JDownloader no puede resolver solo esperan aquí tu respuesta"
        actions={
          permission === "default" && (
            <Button
              size="sm"
              Icon={Bell}
              onClick={async () => setAsked(await Notification.requestPermission())}
            >
              Avisarme con notificaciones
            </Button>
          )
        }
      />
      {isPending ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Spinner /> Cargando…
        </div>
      ) : !captchas?.length ? (
        <Card>
          <Empty Icon={ShieldQuestion} title="Ningún captcha pendiente">
            Cuando una descarga necesite uno aparecerá aquí, con un aviso en el menú.
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {captchas.map((job) => (
            <CaptchaCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Shows a browser notification and puts the count in the tab title when new captchas arrive. */
export function CaptchaNotifier() {
  const { data: captchas } = useCaptchas();
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!captchas) return;
    const fresh = captchas.filter((job) => !seen.current.has(job.id));
    const canNotify = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (fresh.length && canNotify && document.hidden) {
      new Notification("Captcha pendiente", {
        body: fresh.map((job) => job.hoster).join(", "),
        tag: "captcha",
      });
    }
    seen.current = new Set(captchas.map((job) => job.id));
  }, [captchas]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = captchas?.length ? `(${captchas.length}) ${base}` : base;
  }, [captchas?.length]);

  return null;
}
