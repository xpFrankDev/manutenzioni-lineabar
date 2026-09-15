# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: React + Vite for the mobile-first client, Node.js + Express for the API, and MariaDB with versioned SQL migrations. This separates the operational interface from the security and persistence boundary while remaining straightforward to deploy behind Nginx.

## Users

The owner/administrator of Linea Bar di Gianluca Testa oversees all operations, billing, reporting, assignments, and configurable records. Technicians work primarily from a phone while onsite at Italian bars and restaurants, recording completed maintenance, machines, fitted parts, time, and receipts. Office staff may be added later with restricted master-data and reporting access.

## Product Purpose

Linea Bar records field maintenance for coffee machines, ice makers, dishwashers, water filters, and softeners. It replaces paper slips with a fast, accountable digital record that connects a customer, provider, machine, technician, maintenance, parts, price, and next service date.

## Positioning

The product joins a technician's in-the-moment receipt workflow with the machine-level service calendar: every part installed can determine a future maintenance requirement rather than merely becoming an invoice line.

## Operating Context

Technicians visit client locations in Italy, often using a mobile phone. A client can be private or linked to a provider such as La Cimbali, Hausbrandt, or illy. A receipt (scontrino) may be photographed to accelerate entry. Monthly close is important for revenue. Maintenance can be created from a receipt or independently at a warehouse or customer location.

## Capabilities and Constraints

- Role-based access: administrator has all capabilities; technicians see and manage only authorized work.
- Routes live under `/lineabar/`, including login, dashboard, receipts, maintenance, settings, and reports.
- All persistent entities use audit fields: `creato_at`, `modificato_at`, `utente_crea`, `utente_modifica`, and `stato`.
- The UI must be mobile-first, validate required input, preserve user sessions, and expose modular configuration/master data.
- Required records include providers, customers, machines and brands, maintenance, parts and characteristics, receipts, technicians, tasks, and a maintenance calendar.
- The initial visual implementation uses realistic illustrative data; it is not a production database or deployed Nginx configuration yet.

## Brand Commitments

The business is Linea Bar di Gianluca Testa. Its supplied brand colors are blue and white; a logo will be supplied later. Italian is the default user-facing language for the local operating context.

## Evidence on Hand

There is no logo, photography, production database, or receipt sample in the repository. The requested customer, provider, machine, part, and schedule rules are the source of truth for the first build.

## Product Principles

- Make onsite entry fast enough to replace paper rather than duplicate it.
- Keep technical traceability attached to the machine and its parts.
- Show the next useful action before the full administrative detail.
- Protect data and visibility according to a user's role.
- Keep configuration flexible for changing providers, clients, inventory, and service rules.

## Accessibility & Inclusion

Mobile controls must be touch-friendly, keyboard-accessible, clearly labeled, and readable in field conditions.
