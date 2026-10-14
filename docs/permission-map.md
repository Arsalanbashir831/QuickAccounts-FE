# Permission map

The frontend does not define authorization. These labels describe UI intent only and must be mapped to actual backend actions.

| Workspace | Typical read capability | Sensitive actions requiring explicit capability |
|---|---|---|
| Home | Scoped task and summary read | Approve queued work |
| Sales | Invoice/order read | Complete sale, discount override, refund, delivery |
| Purchases | Order/receipt/bill read | Receive stock, register serials, approve bill, pay supplier |
| Stock | Product/balance/movement read | Transfer approval, dispatch, receive, count adjustment |
| Returns and Warranty | Case/unit-history read | Credit, refund, replacement, scrap, supplier settlement |
| Money | Scoped money activity read | Receive/pay/move money, reconcile, manage accounts, close period |
| Contacts | Party read | Export private data, view salary, manage login access |
| Reports | Named report read | Financial statements, audit export, large export job |
| Settings | Company configuration read | Team/role changes, tax rules, opening balances, restore jobs |

UI visibility is convenience only. Django must authorize each read and command.
