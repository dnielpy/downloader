"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/jd/api";
import type { Account, BasicAuth, BasicAuthType } from "@/lib/jd/types";
import { bytes, date, dateTime } from "@/lib/format";
import { keys, useAction } from "@/lib/queries";

import { Button, IconButton } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field, Input, Select, Switch } from "../ui/field";
import { Badge, Card, CardHeader, Empty, PageHeader, Progress, Spinner } from "../ui/misc";
import { usePrompt } from "../ui/prompt";

function AccountStatus({ account }: { account: Account }) {
  if (account.enabled === false) return <Badge>Desactivada</Badge>;
  if (account.errorType)
    return <Badge tone="danger">{account.errorString || account.errorType}</Badge>;
  if (account.valid === false) return <Badge tone="danger">No válida</Badge>;
  return <Badge tone="success">Válida</Badge>;
}

function Traffic({ account }: { account: Account }) {
  const left = account.trafficLeft ?? -1;
  const max = account.trafficMax ?? -1;
  if (left < 0 && max < 0) return <span className="text-muted">Ilimitado</span>;
  return (
    <div className="flex flex-col gap-1">
      {max > 0 && (
        <Progress value={(left / max) * 100} tone={left / max < 0.1 ? "rose" : "emerald"} />
      )}
      <span className="text-xs text-muted">
        {bytes(left)}
        {max > 0 && ` de ${bytes(max)}`}
      </span>
    </div>
  );
}

type AccountForm = { id?: number; hoster: string; username: string; password: string };

function AccountDialog({ form, onClose }: { form: AccountForm | null; onClose: () => void }) {
  const [value, setValue] = useState<AccountForm>({ hoster: "", username: "", password: "" });
  const [opened, setOpened] = useState<AccountForm | null>(null);
  const run = useAction();
  const { data: hosters } = useQuery({
    queryKey: keys.hosters,
    queryFn: api.accounts.hosters,
    enabled: form !== null && form.id === undefined,
    staleTime: 10 * 60_000,
  });

  // A new form resets the fields
  if (form !== opened) {
    setOpened(form);
    if (form) setValue(form);
  }

  const editing = form?.id !== undefined;
  const save = async () => {
    const done = await run(
      () =>
        editing
          ? api.accounts.update(form!.id!, value.username, value.password)
          : api.accounts.add(value.hoster.trim(), value.username, value.password),
      {
        refresh: [keys.accounts],
        success: editing ? "Cuenta actualizada" : "Cuenta añadida: comprobándola…",
      },
    );
    if (done !== undefined) onClose();
  };

  return (
    <Dialog
      open={form !== null}
      onClose={onClose}
      onSubmit={save}
      title={editing ? `Editar cuenta de ${form?.hoster}` : "Añadir cuenta premium"}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!value.hoster.trim() || !value.password}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!editing && (
          <Field
            label="Host"
            hint={
              hosters ? `${hosters.length} hosts admiten cuentas` : "Cargando la lista de hosts…"
            }
          >
            <Input
              autoFocus
              list="premium-hosters"
              value={value.hoster}
              onChange={(e) => setValue({ ...value, hoster: e.target.value })}
              placeholder="rapidgator.net"
            />
            <datalist id="premium-hosters">
              {hosters?.map((hoster) => (
                <option key={hoster} value={hoster} />
              ))}
            </datalist>
          </Field>
        )}
        <Field label="Usuario o email">
          <Input
            value={value.username}
            onChange={(e) => setValue({ ...value, username: e.target.value })}
            autoComplete="off"
          />
        </Field>
        <Field label="Contraseña o clave API">
          <Input
            type="password"
            value={value.password}
            onChange={(e) => setValue({ ...value, password: e.target.value })}
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Dialog>
  );
}

type AuthForm = Omit<BasicAuth, "id"> & { id?: number };

function BasicAuthDialog({ form, onClose }: { form: AuthForm | null; onClose: () => void }) {
  const [value, setValue] = useState<AuthForm | null>(null);
  const [opened, setOpened] = useState<AuthForm | null>(null);
  const run = useAction();
  if (form !== opened) {
    setOpened(form);
    setValue(form);
  }
  const editing = form?.id !== undefined;
  const save = async () => {
    if (!value) return;
    const done = await run(
      async () => {
        if (editing) await api.accounts.updateBasicAuth(value as BasicAuth);
        else
          await api.accounts.addBasicAuth(
            value.type,
            value.hostmask,
            value.username,
            value.password,
          );
        return true;
      },
      { refresh: [keys.basicAuths], success: "Guardado" },
    );
    if (done !== undefined) onClose();
  };
  return (
    <Dialog
      open={form !== null}
      onClose={onClose}
      onSubmit={save}
      title={editing ? "Editar autenticación" : "Añadir autenticación"}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!value?.hostmask.trim()}>
            Guardar
          </Button>
        </>
      }
    >
      {value && (
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <Field label="Tipo">
            <Select
              value={value.type}
              onChange={(e) => setValue({ ...value, type: e.target.value as BasicAuthType })}
            >
              <option value="HTTP">HTTP</option>
              <option value="FTP">FTP</option>
            </Select>
          </Field>
          <Field label="Host" hint="Admite comodines, p. ej. *.ejemplo.com">
            <Input
              value={value.hostmask}
              onChange={(e) => setValue({ ...value, hostmask: e.target.value })}
            />
          </Field>
          <Field label="Usuario" className="sm:col-span-2">
            <Input
              value={value.username}
              onChange={(e) => setValue({ ...value, username: e.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Contraseña" className="sm:col-span-2">
            <Input
              type="password"
              value={value.password}
              onChange={(e) => setValue({ ...value, password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

export function AccountsView() {
  const run = useAction();
  const { confirm } = usePrompt();
  const [accountForm, setAccountForm] = useState<AccountForm | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm | null>(null);
  const accounts = useQuery({
    queryKey: keys.accounts,
    queryFn: api.accounts.list,
    refetchInterval: 10_000,
  });
  const auths = useQuery({ queryKey: keys.basicAuths, queryFn: api.accounts.basicAuths });
  const refresh = { refresh: [keys.accounts] };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cuentas"
        subtitle="Cuentas premium de los hosts y usuarios para sitios con contraseña"
        actions={
          <>
            <Button
              size="sm"
              Icon={RefreshCw}
              disabled={!accounts.data?.length}
              onClick={() =>
                run(() => api.accounts.refresh(accounts.data!.map((a) => a.uuid)), {
                  ...refresh,
                  success: "Comprobando las cuentas…",
                })
              }
            >
              Comprobar todas
            </Button>
            <Button
              variant="primary"
              Icon={Plus}
              onClick={() => setAccountForm({ hoster: "", username: "", password: "" })}
            >
              Añadir cuenta
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader title="Cuentas premium" Icon={Crown} />
        {accounts.isPending ? (
          <div className="flex items-center gap-2 px-5 pb-5 text-sm text-muted">
            <Spinner /> Cargando…
          </div>
        ) : !accounts.data?.length ? (
          <Empty Icon={Crown} title="Sin cuentas premium">
            Con una cuenta premium JDownloader descarga sin esperas ni captchas y a toda velocidad.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="border-y border-surface-border px-5 py-2 font-medium">Host</th>
                  <th className="border-y border-surface-border py-2 pr-3 font-medium">Usuario</th>
                  <th className="border-y border-surface-border py-2 pr-3 font-medium">Estado</th>
                  <th className="border-y border-surface-border py-2 pr-3 font-medium max-md:hidden">
                    Tráfico
                  </th>
                  <th className="border-y border-surface-border py-2 pr-3 font-medium max-sm:hidden">
                    Caduca
                  </th>
                  <th className="border-y border-surface-border" />
                </tr>
              </thead>
              <tbody>
                {accounts.data.map((account) => (
                  <tr
                    key={account.uuid}
                    className={`row-hover ${account.enabled === false ? "opacity-60" : ""}`}
                  >
                    <td className="border-b border-surface-border px-5 py-2.5 font-medium">
                      {account.hostname}
                    </td>
                    <td className="border-b border-surface-border py-2.5 pr-3">
                      {account.username}
                    </td>
                    <td className="border-b border-surface-border py-2.5 pr-3">
                      <AccountStatus account={account} />
                    </td>
                    <td className="w-48 border-b border-surface-border py-2.5 pr-3 max-md:hidden">
                      <Traffic account={account} />
                    </td>
                    <td
                      className="border-b border-surface-border py-2.5 pr-3 text-muted max-sm:hidden"
                      title={dateTime(account.validUntil)}
                    >
                      {account.validUntil && account.validUntil > 0
                        ? date(account.validUntil)
                        : "Nunca"}
                    </td>
                    <td className="border-b border-surface-border py-1.5 pr-3 text-right whitespace-nowrap">
                      <IconButton
                        label="Comprobar"
                        Icon={RefreshCw}
                        onClick={() => run(() => api.accounts.refresh([account.uuid]), refresh)}
                      />
                      <IconButton
                        label={account.enabled === false ? "Activar" : "Desactivar"}
                        Icon={account.enabled === false ? Power : PowerOff}
                        onClick={() =>
                          run(
                            () =>
                              account.enabled === false
                                ? api.accounts.enable([account.uuid])
                                : api.accounts.disable([account.uuid]),
                            refresh,
                          )
                        }
                      />
                      <IconButton
                        label="Editar"
                        Icon={Pencil}
                        onClick={() =>
                          setAccountForm({
                            id: account.uuid,
                            hoster: account.hostname,
                            username: account.username ?? "",
                            password: "",
                          })
                        }
                      />
                      <IconButton
                        label="Borrar"
                        Icon={Trash2}
                        tone="danger"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Borrar cuenta",
                            message: `Se borrará la cuenta ${account.username} de ${account.hostname}.`,
                            confirm: "Borrar",
                            danger: true,
                          });
                          if (ok) await run(() => api.accounts.remove([account.uuid]), refresh);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Autenticación HTTP y FTP"
          Icon={LockKeyhole}
          actions={
            <Button
              size="sm"
              Icon={Plus}
              onClick={() =>
                setAuthForm({
                  type: "HTTP",
                  hostmask: "",
                  username: "",
                  password: "",
                  enabled: true,
                })
              }
            >
              Añadir
            </Button>
          }
        />
        {!auths.data?.length ? (
          <Empty Icon={KeyRound} title="Sin usuarios guardados">
            Para servidores que piden usuario y contraseña (HTTP básico o FTP).
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {auths.data.map((auth) => (
                  <tr key={auth.id} className="row-hover">
                    <td className="border-t border-surface-border px-5 py-2.5">
                      <Badge tone="info">{auth.type}</Badge>
                    </td>
                    <td className="border-t border-surface-border py-2.5 pr-3 font-medium">
                      {auth.hostmask}
                    </td>
                    <td className="border-t border-surface-border py-2.5 pr-3">{auth.username}</td>
                    <td className="border-t border-surface-border py-2.5 pr-3">
                      <Switch
                        checked={auth.enabled}
                        onChange={(enabled) =>
                          run(() => api.accounts.updateBasicAuth({ ...auth, enabled }), {
                            refresh: [keys.basicAuths],
                          })
                        }
                      />
                    </td>
                    <td className="border-t border-surface-border py-1.5 pr-3 text-right whitespace-nowrap">
                      <IconButton label="Editar" Icon={Pencil} onClick={() => setAuthForm(auth)} />
                      <IconButton
                        label="Borrar"
                        Icon={Trash2}
                        tone="danger"
                        onClick={() =>
                          run(() => api.accounts.removeBasicAuths([auth.id]), {
                            refresh: [keys.basicAuths],
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AccountDialog form={accountForm} onClose={() => setAccountForm(null)} />
      <BasicAuthDialog form={authForm} onClose={() => setAuthForm(null)} />
    </div>
  );
}
