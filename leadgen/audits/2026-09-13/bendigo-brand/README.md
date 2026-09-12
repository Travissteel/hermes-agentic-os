# Bendigo Restumping design

Next site after the Ballarat pilot, chosen using the existing Search Console audit: 426 impressions in the 28 days ending 9 September, the highest of the four active sites. That is a prioritisation input, not evidence of a design result.

Changes:
- Slate and muted gold, subtle measurement grid, squared cards and a level-style brand mark.
- Opening question: “Does your home need re-levelling or restumping?”
- Direct links to the existing full-house cost guide and laser re-levelling page.
- Five service cards describe the symptoms or decision relevant to that service.
- Clear enquiry confirmation explaining review, discussion and the customer's decision, with no invented response-time promise.
- Optional brand style and quick links live in protected site configuration; shared template supports the treatment without changing the Ballarat variant.

Existing service URLs, full service content, canonical and metadata retained. Email API and runtime secrets unchanged. Operator voice retained. No new ratings, credentials, team photos or claimed jobs.

Validation: local browser checks at 360, 390, 768 and 1440 px; one H1, matching canonical, five cards, no horizontal overflow or browser errors. Intercepted form tests cover explicit delivery failure with retained input and successful confirmation. No real enquiries sent. Shared template TypeScript passed; deployment uses a production Next/OpenNext build.

See the deployment record, live checks and screenshots alongside this file. A ranking or conversion improvement has not yet been measured.

Live verification passed at all four viewport sizes. Both guidance links return 200 with matching canonical URLs. Source and deployed version are recorded in `deployment.json`.
