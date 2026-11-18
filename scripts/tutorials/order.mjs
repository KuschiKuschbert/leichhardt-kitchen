// The tutorial videos in viewing order, and which of them only the chefs see (docs/tutorial-videos.md).
// make.mjs films and joins them in this order; catalogue.mjs makes them into guides for the book's Guides page.
export const ORDER = ['sign-in', 'home', 'recipes', 'prep', 'orders', 'wastage', 'transfers', 'deliveries', 'guides', 'team-talk', 'drinks',
  'todays-team', 'cleaning', 'functions', 'settings', 'chef-panel', 'supplier-order', 'recipes-manage', 'admin-today', 'admin-reports', 'admin-kitchen'];

// Head chef, 19 Nov 2026: the videos of pages the team uses are for everyone; these are for the head chef, the sous chefs
// and the admin only (their links sit in a record the rules let only them read).
export const CHEFS = ['todays-team', 'chef-panel', 'supplier-order', 'recipes-manage', 'admin-today', 'admin-reports', 'admin-kitchen'];
