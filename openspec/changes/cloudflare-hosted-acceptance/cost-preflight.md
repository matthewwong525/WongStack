# Functionality trial cost preflight

State: partial read-only pricing; not a live spending approval or complete feasibility proof. Final exact request retains $10 incremental total, $8 admission stop and two hours including cleanup. Do not subscribe to a plan, restart billing, buy AI credits or assume unused included quotas.

| Item | Observed public pricing / proposed bound | Remaining execution check |
| --- | --- | --- |
| Existing Workers paid account | Artifacts requires Workers Paid; current account subscription query403 cannot prove status | Verify existing suitable paid platform account; no plan purchase/change |
| SDK standard-2 runner | 1vCPU/6GiB memory/12GB provisioned disk;90min cap. At marginal rates CPU0.000020/vCPU-second + memory0.0000025/GiB-second + disk0.00000007/GB-second, provisioned fullCPU bound is USD0.193536 | Exact deployed type/max_instances1,90min durable reservation and stop/readback |
| Container egress | Up to2GB at highest listed0.05/GB is USD0.10 | Keep bounded workload/dependencies; no assumed free allocation |
| Artifacts operations/storage | Docs announce billing starts2026-10-14; today2026-10-04. Later rate0.15/1000 operations +0.50/GB-month after included allowances | Recheck execution-day rate and exact paid availability; inventory401 remains unresolved |
| R2 Standard |0.015/GB-month,4.50/million ClassA,0.36/million ClassB; billed usage rounds up units | Complete operation/storage estimate and existing usage. Small marginal additions can incur a full4.50 ClassA unit; do not price only the unrounded tiny fraction. No Infrequent Access |
| Container registry, Workers/Workflow/DO/logs/D1/Access | Existing service and one bounded controlled job; all applicable incremental charges count | Freeze exact input/image/retention and applicable current rates before claiming total feasibility |
| VM + primaryIPv4 | Exactly one CPX22 for at most2h; proposed gross total allocationUSD0.30 | Actual Hetzner account/location/server/IP tax/currency/price readback unavailable on host; runtime token exists but is not exposed. Freeze supported existing firewall ID and quoted costs before creation; refuse if incompatible |
| AI | Proposed zero additional AI spend: owner signs into an already held plan and uses included quota only | Verify actual owner plan/quota; refuse API/pay-as-you-go usage, top-up, new plan or trial; no credentials transferred |
| Cleanup reserve |USD2 within total; stop new admissions atUSD8 estimate /90min | Deletion/absence readbacks rather than power-off/TTL; name unresolved cost/resource leftovers |

Sources rechecked2026-10-04: [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/), [Artifacts pricing](https://developers.cloudflare.com/artifacts/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Hetzner billing FAQ](https://docs.hetzner.com/cloud/billing/faq/). These public rates are inputs, not actual provider or invoice receipts. Root credentials were used only for authenticated read-only scope/status checks; no new token, resource, payment or subscription was created.
