# @swedish-erp/domain-observability

Operational telemetry boundary for structured logs, trace spans, invariant alarms and company-scoped observability views across API and worker runtime.

## Scope

- record structured operational logs with severity, correlation and source-object metadata
- start and finish trace spans for API and worker execution paths
- synchronize invariant alarms from runtime findings, provider health and projection lag
- expose filtered log, trace and alarm views for company-scoped observability workbenches
- persist observability state through critical-domain durability so API and worker can share telemetry in protected modes

## Guarantees

- every recorded log is structured, timestamped and filterable by company, surface, event and correlation
- trace spans keep deterministic status transitions from `running` to `completed` or `failed`
- invariant alarms are upserted by source object and alarm code instead of duplicating active alarms
- durability export/import preserves observability lineage across runtime restarts
