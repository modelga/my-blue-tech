"use client";

import { dump as dumpYaml, load as parseYaml } from "js-yaml";
import { useState } from "react";
import {
  colors,
  fieldError,
  formLabel,
  monoTextarea,
  payloadEditorHeader,
  payloadFormatButton,
  payloadFormatButtonActive,
  payloadFormatToggle,
} from "@/lib/styles";

export type Format = "json" | "yaml";

const DEFAULT_EXAMPLES: Record<Format, string> = {
  json: "{}",
  yaml: "{}\n",
};

export function parsePayload(value: string, format: Format): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const data = format === "json" ? JSON.parse(value) : parseYaml(value);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

interface PayloadEditorProps {
  label: string;
  defaultValue?: string;
  defaultFormat?: Format;
  /** Fallback content shown when format conversion fails. */
  examples?: Record<Format, string>;
  rows?: number;
  onChange: (raw: string, parsed: unknown | null, error: string | null) => void;
}

export function PayloadEditor({ label, defaultValue, defaultFormat = "json", examples = DEFAULT_EXAMPLES, rows = 16, onChange }: PayloadEditorProps) {
  const initial = defaultValue ?? examples[defaultFormat];
  const initialResult = parsePayload(initial, defaultFormat);

  const [format, setFormat] = useState<Format>(defaultFormat);
  const [value, setValue] = useState(initial);
  const [parseError, setParseError] = useState<string | null>(initialResult.ok ? null : initialResult.error);

  function handleValueChange(next: string) {
    setValue(next);
    const result = parsePayload(next, format);
    const error = result.ok ? null : result.error;
    setParseError(error);
    onChange(next, result.ok ? result.data : null, error);
  }

  function handleFormatChange(next: Format) {
    if (next === format) return;
    const result = parsePayload(value, format);
    let nextValue: string;
    if (result.ok) {
      nextValue = next === "json" ? JSON.stringify(result.data, null, 2) : dumpYaml(result.data as object, { indent: 2 });
    } else {
      nextValue = examples[next];
    }
    setFormat(next);
    setValue(nextValue);
    const nextResult = parsePayload(nextValue, next);
    const error = nextResult.ok ? null : nextResult.error;
    setParseError(error);
    onChange(nextValue, nextResult.ok ? nextResult.data : null, error);
  }

  return (
    <div style={formLabel}>
      <div style={payloadEditorHeader}>
        <span>{label}</span>
        <div style={payloadFormatToggle}>
          {(["json", "yaml"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFormatChange(f)}
              style={{
                ...payloadFormatButton,
                ...(format === f ? payloadFormatButtonActive : {}),
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        style={{
          ...monoTextarea,
          borderColor: parseError ? "#fca5a5" : colors.border,
        }}
      />
      {parseError && <span style={fieldError}>{parseError}</span>}
    </div>
  );
}
