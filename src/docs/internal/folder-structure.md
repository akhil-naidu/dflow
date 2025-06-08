# Folder Structure

```
src
|-actions (database mutations & queue triggering)
|-queues (message-queues)
|-lib
| |-dokku (dokku ssh commands)
| |-server (server ssh commands)
| |-netdata (monitoring API call's)
|-emails (email templates)
|-providers (React context providers)
|-payload (collections, access-control, endpoints)
|-docs (reference docs)
|-app
| |-(frontend) (entire UI)
| |-(payload) (payload-admin-panel)
```
