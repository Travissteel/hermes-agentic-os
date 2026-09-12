# Ballarat Restumping brand pilot

Implemented the approved first design pilot on 12 September 2026.

- Warm cream, timber-brown and copper treatment, with a simple foundation mark in the navigation.
- Opening headline: “Uneven floors? Cracking walls?” The service and location remain directly above it, and the canonical and search title are retained.
- Six symptom-led service cards use the existing service URLs. The full service-page copy remains available.
- The quote form explains that customers can describe the symptoms without diagnosing the cause.
- The confirmation explains enquiry review, discussion and the customer's decision. It makes no response-time promise and distinguishes an enquiry from authorising work.
- Existing operator voice and email delivery API retained. No new reviews, credentials, team images or claimed customer projects added.

The optional `SITE.homepage` configuration owns the headline, introduction and service-card copy. Shared template support means a later sync preserves this site's design. Other sites can adopt a deliberate treatment in a subsequent rollout; this is the Ballarat pilot.

Validation: 360, 390, 768 and 1440 px browser checks; no overflow, one H1, correct canonical, six service cards, no browser errors. Intercepted form tests cover delivery failure with retained input and the new success confirmation. No real enquiry was submitted. Shared template TypeScript check passed; the production deployment runs its own Next/OpenNext build.

Real team and job photography, verified reviews and operator credentials remain the next trust upgrade when authentic assets are available. Assess the pilot's usability and enquiry performance before copying it across the network; this deployment does not establish a ranking or conversion lift.

Live verification passed on the public domain at all four viewport sizes. Source commit and deployment record: `deployment.json`. Screenshots show the deployed version.
