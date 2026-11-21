"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field, Input } from "./field";

type PromptOptions = {
  title: string;
  label?: string;
  initial?: string;
  placeholder?: string;
  confirm?: string;
  type?: "text" | "password";
};

type ConfirmOptions = { title: string; message: ReactNode; confirm?: string; danger?: boolean };

type Request =
  | ({ kind: "prompt" } & PromptOptions & { resolve: (value: string | null) => void })
  | ({ kind: "confirm" } & ConfirmOptions & { resolve: (value: boolean) => void });

const PromptContext = createContext<{
  prompt: (options: PromptOptions) => Promise<string | null>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}>({ prompt: async () => null, confirm: async () => false });

/** `await prompt({title})` asks for a text (null when cancelled); `await confirm({…})` asks yes or no. */
export function usePrompt() {
  return useContext(PromptContext);
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(options.initial ?? "");
        setRequest({ kind: "prompt", ...options, resolve });
      }),
    [],
  );
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ kind: "confirm", ...options, resolve })),
    [],
  );

  const close = () => {
    if (request?.kind === "prompt") request.resolve(null);
    if (request?.kind === "confirm") request.resolve(false);
    setRequest(null);
  };
  const accept = () => {
    if (request?.kind === "prompt") request.resolve(value);
    if (request?.kind === "confirm") request.resolve(true);
    setRequest(null);
  };

  return (
    <PromptContext.Provider value={{ prompt, confirm }}>
      {children}
      <Dialog
        open={request !== null}
        onClose={close}
        onSubmit={accept}
        title={request?.title ?? ""}
        footer={
          <>
            <Button onClick={close}>Cancelar</Button>
            <Button
              type="submit"
              variant={request?.kind === "confirm" && request.danger ? "danger" : "primary"}
            >
              {request?.confirm ?? "Aceptar"}
            </Button>
          </>
        }
      >
        {request?.kind === "prompt" && (
          <Field label={request.label ?? ""}>
            <Input
              autoFocus
              type={request.type ?? "text"}
              value={value}
              placeholder={request.placeholder}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => event.target.select()}
            />
          </Field>
        )}
        {request?.kind === "confirm" && <div className="text-sm">{request.message}</div>}
      </Dialog>
    </PromptContext.Provider>
  );
}
