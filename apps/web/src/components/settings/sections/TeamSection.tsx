"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, EmptyState } from "@famm/ui";
import { TeammateRow } from "@/components/settings/TeammateRow";
import { InviteTeammateSheet } from "@/components/settings/InviteTeammateSheet";
import {
  useInviteTeammate,
  useRemoveTeammate,
  useTeam,
  useUpdateTeammateRole,
} from "@/lib/account/api";
import { trackEvent } from "@/lib/api/events";
import type { MemberRole } from "@/lib/account/types";

export interface TeamSectionProps {
  currentUserId: string;
  canEdit: boolean;
}

export function TeamSection({ currentUserId, canEdit }: TeamSectionProps) {
  const { data, isLoading } = useTeam();
  const invite = useInviteTeammate();
  const removeMember = useRemoveTeammate();
  const updateRole = useUpdateTeammateRole();

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  if (isLoading || !data) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" />;
  }

  const members = data.members;
  const onlyOwner = members.length <= 1;

  async function handleInvite(input: {
    email: string;
    firstName: string;
    lastName: string;
    role: Exclude<MemberRole, "TENANT_OWNER" | "CLIENT" | "SUPER_ADMIN" | "GUEST">;
  }) {
    setInviteError(null);
    try {
      await invite.mutateAsync(input);
      trackEvent({ name: "settings.team.invited", payload: { role: input.role } });
      setInviteOpen(false);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Couldn't send invite");
    }
  }

  return (
    <>
      {onlyOwner ? (
        <EmptyState
          title="You're flying solo"
          description="Invite a teammate to share the load — they get their own login."
          action={
            canEdit ? (
              <Button onClick={() => setInviteOpen(true)}>
                <Plus aria-hidden className="mr-inline-xs h-4 w-4" />
                Invite teammate
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-stack-xs">
            {members.map((m) => (
              <TeammateRow
                key={m.id}
                member={m}
                isSelf={m.id === currentUserId}
                canEdit={canEdit}
                onRoleChange={(role) =>
                  void updateRole.mutateAsync({ id: m.id, role }).catch(() => null)
                }
                onRemove={() => void removeMember.mutateAsync(m.id).catch(() => null)}
              />
            ))}
          </ul>
          {canEdit ? (
            <div className="flex">
              <Button type="button" variant="outline" size="md" onClick={() => setInviteOpen(true)}>
                <Plus aria-hidden className="mr-inline-xs h-4 w-4" />
                Invite teammate
              </Button>
            </div>
          ) : null}
        </>
      )}

      <InviteTeammateSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        busy={invite.isPending}
        errorMessage={inviteError}
      />
    </>
  );
}
