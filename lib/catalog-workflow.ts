import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { z } from "zod";
import { providerIds, type ProviderId } from "./types";
import { createProvider } from "./providers/adapters";
import {
  durableSync,
  type DurableSteps,
  type StepOutput,
} from "./services/durable-sync";
export class CatalogSyncWorkflow extends WorkflowEntrypoint<
  CloudflareEnv,
  { providerId: ProviderId }
> {
  async run(
    event: WorkflowEvent<{ providerId: ProviderId }>,
    step: WorkflowStep,
  ) {
    const id = z.enum(providerIds).parse(event.payload.providerId);
    const durableSteps: DurableSteps = {
      do: <T extends StepOutput>(name: string, callback: () => Promise<T>) =>
        step.do(
          name,
          {
            retries: { limit: 2, delay: "5 seconds", backoff: "exponential" },
            timeout: "5 minutes",
          },
          callback as () => Promise<StepOutput>,
        ) as Promise<T>,
    };
    return durableSync(
      this.env.DB,
      createProvider(id, this.env),
      durableSteps,
      event.instanceId,
    );
  }
}
