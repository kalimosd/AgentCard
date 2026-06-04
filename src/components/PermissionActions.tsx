import { ArrowLeft, CheckCircle2, ShieldAlert, X } from "lucide-react";
import type { InterventionCard } from "../types";
import type { AgentViewProps } from "./types";
import {
  permissionDecisionClassName,
  permissionDecisionLabels,
  permissionDecisionsForIntervention
} from "./interventionUtils";

export function PermissionOrJumpActions({
  snapshot,
  canDecideOnTablet,
  decidePermission,
  jumpBack,
  dismissIntervention
}: {
  snapshot: AgentViewProps["snapshot"];
  canDecideOnTablet: boolean;
  decidePermission: AgentViewProps["decidePermission"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
}) {
  const decisions = permissionDecisionsForIntervention(
    snapshot.intervention,
    canDecideOnTablet
  );

  return (
    <div className="attention-actions">
      {decisions.length > 0 ? (
        <PermissionDecisionButtons
          intervention={snapshot.intervention}
          canDecideOnTablet={canDecideOnTablet}
          decidePermission={decidePermission}
        />
      ) : (
        <button type="button" className="btn-primary" onClick={() => jumpBack()}>
          <ArrowLeft size={18} />
          回 Terminal
        </button>
      )}
      <button type="button" className="btn-muted" onClick={dismissIntervention}>
        忽略
      </button>
    </div>
  );
}

export function PermissionControlsPreview({
  snapshot,
  canDecideOnTablet,
  decidePermission,
  jumpBack,
  dismissIntervention
}: {
  snapshot: AgentViewProps["snapshot"];
  canDecideOnTablet: boolean;
  decidePermission: AgentViewProps["decidePermission"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
}) {
  if (snapshot.intervention?.kind === "waiting_approval") {
    const decisions = permissionDecisionsForIntervention(
      snapshot.intervention,
      canDecideOnTablet
    );

    return (
      <div className="control-actions">
        {decisions.length > 0 ? (
          <PermissionDecisionButtons
            intervention={snapshot.intervention}
            canDecideOnTablet={canDecideOnTablet}
            decidePermission={decidePermission}
          />
        ) : (
          <button type="button" className="btn-primary" onClick={() => jumpBack()}>
            <ArrowLeft size={18} />
            Terminal
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="control-actions">
      <button type="button" className="btn-primary" onClick={() => jumpBack()}>
        <ArrowLeft size={18} />
        Jump Back
      </button>
      <button type="button" className="btn-muted" onClick={dismissIntervention}>
        Dismiss
      </button>
    </div>
  );
}

export function PermissionDecisionButtons({
  intervention,
  canDecideOnTablet,
  decidePermission
}: {
  intervention?: InterventionCard;
  canDecideOnTablet: boolean;
  decidePermission: AgentViewProps["decidePermission"];
}) {
  return (
    <>
      {permissionDecisionsForIntervention(intervention, canDecideOnTablet).map(
        (decision) => (
          <button
            type="button"
            className={permissionDecisionClassName(decision)}
            key={decision}
            onClick={() => decidePermission(intervention!.permissionId!, decision)}
          >
            {decision === "always" ? (
              <ShieldAlert size={18} />
            ) : decision === "deny" ? (
              <X size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {permissionDecisionLabels[decision]}
          </button>
        )
      )}
    </>
  );
}
