# Business Goal

**Product**: An online jewelry store with an integrated content platform (blog), built to let customers browse and select jewelry products, save items to a cart, and place orders — with a clear path to grow into full e-commerce with payments.

## Core Purpose

Give a jewelry seller a single web presence where they can:
- Showcase their catalog with rich product detail
- Publish editorial/blog content (collection stories, care guides, trends, behind-the-scenes) to build trust and drive organic traffic
- Let customers register, log in, and manage their own account
- Let customers add products to a cart and submit an order for the seller to fulfill manually (outside the platform, e.g. via direct contact) in the initial phase
- Scale toward a fully self-serve checkout experience (real payments, saved addresses, automated order history) without re-architecting the product

## Target Users

- **Customers**: people browsing and buying jewelry online, who want a trustworthy, content-rich shopping experience and a simple way to express interest in items and finalize a purchase.
- **Store owner / admin**: manages the catalog, blog content, and order flow without needing developer help for day-to-day changes.

## Functional Scope

### Phase 1 (MVP)
- **Catalog**: products with configurable, admin-controlled custom attributes (e.g. metal type, gemstone, size, weight) — the admin can define/edit these fields without code changes.
- **Blog**: editorial content management, categorization, publishing workflow.
- **Authentication**: account creation with verification code flow, login and password reset.
- **Cart**: customers can add/remove products and review a summary of selected items.
- **Order submission**: customer finalizes their cart as an order; this creates a record the admin can see, and notifies the seller directly (outside the platform) so the sale can be completed manually.

### Phase 2 (Future)
- **Payments**: in-platform checkout with real payment processing.
- **Addresses**: customers can save and manage shipping/billing addresses.
- **Order history**: customers can view past orders and their status; admin can track fulfillment end-to-end.
- **Transactions**: full financial record tied to each completed order.

## Success Criteria for MVP

- A customer can discover a product, read related blog content, create an account, build a cart, and submit an order that reaches the seller.
- The admin can add/edit products (including custom attributes), manage blog posts, and see submitted orders — all without developer involvement.
- The data model and account system support adding real payments and order history later without requiring customers to re-register or losing existing catalog/content data.