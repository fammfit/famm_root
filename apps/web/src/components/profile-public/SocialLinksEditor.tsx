"use client";

import * as React from "react";
import { FormField, Input } from "@famm/ui";
import {
  InvalidSocialInputError,
  normalizeHandle,
  normalizeWebsite,
  type SocialPlatform,
} from "@/lib/profile/social-normalize";

export interface SocialLinksValue {
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
}

export interface SocialLinksEditorProps {
  value: SocialLinksValue;
  onChange: (next: SocialLinksValue) => void;
}

type DraftMap = {
  instagram: string;
  tiktok: string;
  youtube: string;
  website: string;
};

type ErrorMap = Partial<Record<keyof DraftMap, string>>;

function valueToDraft(v: SocialLinksValue): DraftMap {
  return {
    instagram: v.instagram ?? "",
    tiktok: v.tiktok ?? "",
    youtube: v.youtube ?? "",
    website: v.website ?? "",
  };
}

export function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  const [draft, setDraft] = React.useState<DraftMap>(() => valueToDraft(value));
  const [errors, setErrors] = React.useState<ErrorMap>({});

  React.useEffect(() => {
    setDraft(valueToDraft(value));
  }, [value]);

  function commitHandle(platform: SocialPlatform, key: keyof DraftMap) {
    const raw = draft[key];
    try {
      const normalized = normalizeHandle(platform, raw);
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      onChange({ ...value, [key]: normalized });
      setDraft((prev) => ({ ...prev, [key]: normalized ?? "" }));
    } catch (err) {
      const msg = err instanceof InvalidSocialInputError ? err.message : "Invalid link";
      setErrors((prev) => ({ ...prev, [key]: msg }));
    }
  }

  function commitWebsite() {
    try {
      const normalized = normalizeWebsite(draft.website);
      setErrors((prev) => ({ ...prev, website: undefined }));
      onChange({ ...value, website: normalized });
      setDraft((prev) => ({ ...prev, website: normalized ?? "" }));
    } catch (err) {
      const msg = err instanceof InvalidSocialInputError ? err.message : "Invalid URL";
      setErrors((prev) => ({ ...prev, website: msg }));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-stack-sm md:grid-cols-2">
      <FormField label="Instagram" error={errors.instagram}>
        <Input
          name="instagram"
          value={draft.instagram}
          placeholder="@yourhandle"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setDraft((prev) => ({ ...prev, instagram: e.target.value }))}
          onBlur={() => commitHandle("instagram", "instagram")}
        />
      </FormField>
      <FormField label="TikTok" error={errors.tiktok}>
        <Input
          name="tiktok"
          value={draft.tiktok}
          placeholder="@yourhandle"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setDraft((prev) => ({ ...prev, tiktok: e.target.value }))}
          onBlur={() => commitHandle("tiktok", "tiktok")}
        />
      </FormField>
      <FormField label="YouTube" error={errors.youtube}>
        <Input
          name="youtube"
          value={draft.youtube}
          placeholder="@yourhandle or full URL"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setDraft((prev) => ({ ...prev, youtube: e.target.value }))}
          onBlur={() => commitHandle("youtube", "youtube")}
        />
      </FormField>
      <FormField label="Website" error={errors.website}>
        <Input
          name="website"
          type="url"
          inputMode="url"
          value={draft.website}
          placeholder="https://example.com"
          autoComplete="url"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))}
          onBlur={commitWebsite}
        />
      </FormField>
    </div>
  );
}
