# Enterprise Architecture Documentation

```
backend/
├── src/
│   ├── app/ (app setup, server, routes, providers)
│   ├── config/ (env, database, redis, storage, services)
│   ├── core/ (errors, middleware, logger, response, validation, security, utils)
│   ├── modules/ (auth, users, organizations, roles, permissions, dashboard, tasks, marketing, finance, management, communication, notifications, automation, audit)
│   ├── integrations/ (calling, whatsapp, instagram, email, storage, payment)
│   ├── database/ (client, migrations, seed)
│   ├── jobs/ (queues, workers, schedulers)
│   ├── events/ (eventBus, publishers, subscribers)
│   └── types/ (TypeScript definitions & interfaces)
```
