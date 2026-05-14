import { readProviders } from "@/lib/configReader";
import { ProvidersClient } from "@/components/providers/ProvidersClient";

export default async function ProvidersPage() {
  const providers = await readProviders();

  return <ProvidersClient providers={providers} />;
}
