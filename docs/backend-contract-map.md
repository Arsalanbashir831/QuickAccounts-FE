# Backend contract map

No Django repository or reviewed OpenAPI document is present in this frontend workspace. Paths must not be invented. Every operation starts as **Needs clarification** until it is checked against the running backend and reviewed schema.

| Feature operation | Actual method and path | Auth/CSRF | Scope | Input/output schema | Errors | Retry/revision policy | Status |
|---|---|---|---|---|---|---|---|
| Session bootstrap | Pending verification | Pending | User, tenant, companies and sites | Pending | 401/403 semantics pending | Read may retry only after policy review | Needs clarification |
| Sign in/out | Pending verification | Session and CSRF pending | User | Pending | Generic credential response required | No blind mutation retry | Needs clarification |
| Company membership | Pending verification | Session | Tenant and company | Pending | 403/404 disclosure policy pending | Read only | Needs clarification |
| Account groups and accounts | Pending verification | Session | Company, optional site view | Pending | Validation/conflict pending | Revision behavior pending | Needs clarification |
| Apply account template | Missing | Session and CSRF | Company | Idempotent preview/apply required | Duplicate/mapping errors pending | Stable command key required | Missing |
| Sale preview and completion | Missing | Session and CSRF | Company and transaction site | Authoritative totals required | Stock/serial/period conflicts pending | Reconciliation required | Missing |
| Purchase receipt | Missing | Session and CSRF | Company and receiving site | Quantity and condition required | Partial/serial errors pending | Reconciliation required | Missing |
| Serial preview/register | Missing | Session and CSRF | Company, product and receipt | String identities required | Row errors/duplicates pending | Preview then commit | Missing |
| Stock transfer stages | Missing | Session and CSRF | Company, source and destination | Stage/revision required | Transit conflict pending | Reconciliation required | Missing |
| Return/warranty case | Missing | Session and CSRF | Company, intake site and original sale | Mixed unit outcomes required | Entitlement/custody conflicts pending | Reconciliation required | Missing |
| Payment and allocation | Missing | Session and CSRF | Company and real money account | Decimal strings required | Balance/allocation conflicts pending | Stable command key required | Missing |
| Report catalog/data/export | Missing | Session | Authorized company/site scope | Typed definitions required | Job errors pending | Reads/jobs only | Missing |

## Evidence required to mark Verified

- Reviewed OpenAPI operation and representative response
- Authentication and CSRF behavior exercised against an approved environment
- Company/site authorization checked independently of the URL
- Validation, conflict, empty-response and request-ID behavior recorded
- Retry/idempotency contract stated by the backend owner for every command
