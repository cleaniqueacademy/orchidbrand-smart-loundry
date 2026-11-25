import React from "react";
import { AccountTier } from "../../types";
import { SubscriptionTab } from "./subscription/SubscriptionTab";
export const SubscriptionStatusCard: React.FC<{ tenantId: string; currentTier?: AccountTier }> = ({ tenantId }) => <SubscriptionTab tenantId={tenantId} />;
