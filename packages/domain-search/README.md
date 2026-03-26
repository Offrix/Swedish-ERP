# @swedish-erp/domain-search

Search projection registry, saved views and dashboard personalization.

## Scope

- search document projections
- async projection rebuild requests
- saved views and repairs
- dashboard widgets backed by reporting/search contracts

## Runtime model

- projection rebuilds are requested through `requestSearchReindex`
- when the async job platform is present, rebuild execution is delegated to the `search.reindex` worker lane
- rebuild requests keep their own domain status while execution history lives in the canonical async-job attempt chain
