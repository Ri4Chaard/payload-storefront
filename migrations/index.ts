import * as migration_20260827_101931_initial from './20260827_101931_initial';
import * as migration_20260828_161241_catalog from './20260828_161241_catalog';
import * as migration_20260901_104008_shop_accordion_titles from './20260901_104008_shop_accordion_titles';
import * as migration_20260901_160441_customer_accounts from './20260901_160441_customer_accounts';
import * as migration_20260901_183138_account_copy_fields from './20260901_183138_account_copy_fields';
import * as migration_20260902_081353_drop_account_copy_global from './20260902_081353_drop_account_copy_global';
import * as migration_20260902_081401_account_settings from './20260902_081401_account_settings';
import * as migration_20260902_112639_drop_marketing_enabled from './20260902_112639_drop_marketing_enabled';
import * as migration_20260903_074224_jobs_queue from './20260903_074224_jobs_queue';
import * as migration_20260909_103616_contact_settings from './20260909_103616_contact_settings';
import * as migration_20260909_112455_expire_carts_task from './20260909_112455_expire_carts_task';
import * as migration_20260909_114622_contact_details from './20260909_114622_contact_details';
import * as migration_20260909_115401_contact_location from './20260909_115401_contact_location';
import * as migration_20260910_093824_story_page_and_faq from './20260910_093824_story_page_and_faq';
import * as migration_20260910_135959_blog_articles from './20260910_135959_blog_articles';
import * as migration_20260910_161343_contact_and_faq from './20260910_161343_contact_and_faq';
import * as migration_20260911_101714_policies_and_cookie_settings from './20260911_101714_policies_and_cookie_settings';
import * as migration_20260911_115955_cookie_banner_body from './20260911_115955_cookie_banner_body';
import * as migration_20260911_121048_cookie_banner_body_rich_text from './20260911_121048_cookie_banner_body_rich_text';
import * as migration_20260911_135539_localization from './20260911_135539_localization';
import * as migration_20260911_141700_language_settings from './20260911_141700_language_settings';

export const migrations = [
  {
    up: migration_20260827_101931_initial.up,
    down: migration_20260827_101931_initial.down,
    name: '20260827_101931_initial',
  },
  {
    up: migration_20260828_161241_catalog.up,
    down: migration_20260828_161241_catalog.down,
    name: '20260828_161241_catalog',
  },
  {
    up: migration_20260901_104008_shop_accordion_titles.up,
    down: migration_20260901_104008_shop_accordion_titles.down,
    name: '20260901_104008_shop_accordion_titles',
  },
  {
    up: migration_20260901_160441_customer_accounts.up,
    down: migration_20260901_160441_customer_accounts.down,
    name: '20260901_160441_customer_accounts',
  },
  {
    up: migration_20260901_183138_account_copy_fields.up,
    down: migration_20260901_183138_account_copy_fields.down,
    name: '20260901_183138_account_copy_fields',
  },
  {
    up: migration_20260902_081353_drop_account_copy_global.up,
    down: migration_20260902_081353_drop_account_copy_global.down,
    name: '20260902_081353_drop_account_copy_global',
  },
  {
    up: migration_20260902_081401_account_settings.up,
    down: migration_20260902_081401_account_settings.down,
    name: '20260902_081401_account_settings',
  },
  {
    up: migration_20260902_112639_drop_marketing_enabled.up,
    down: migration_20260902_112639_drop_marketing_enabled.down,
    name: '20260902_112639_drop_marketing_enabled',
  },
  {
    up: migration_20260903_074224_jobs_queue.up,
    down: migration_20260903_074224_jobs_queue.down,
    name: '20260903_074224_jobs_queue',
  },
  {
    up: migration_20260909_103616_contact_settings.up,
    down: migration_20260909_103616_contact_settings.down,
    name: '20260909_103616_contact_settings',
  },
  {
    up: migration_20260909_112455_expire_carts_task.up,
    down: migration_20260909_112455_expire_carts_task.down,
    name: '20260909_112455_expire_carts_task',
  },
  {
    up: migration_20260909_114622_contact_details.up,
    down: migration_20260909_114622_contact_details.down,
    name: '20260909_114622_contact_details',
  },
  {
    up: migration_20260909_115401_contact_location.up,
    down: migration_20260909_115401_contact_location.down,
    name: '20260909_115401_contact_location',
  },
  {
    up: migration_20260910_093824_story_page_and_faq.up,
    down: migration_20260910_093824_story_page_and_faq.down,
    name: '20260910_093824_story_page_and_faq',
  },
  {
    up: migration_20260910_135959_blog_articles.up,
    down: migration_20260910_135959_blog_articles.down,
    name: '20260910_135959_blog_articles',
  },
  {
    up: migration_20260910_161343_contact_and_faq.up,
    down: migration_20260910_161343_contact_and_faq.down,
    name: '20260910_161343_contact_and_faq',
  },
  {
    up: migration_20260911_101714_policies_and_cookie_settings.up,
    down: migration_20260911_101714_policies_and_cookie_settings.down,
    name: '20260911_101714_policies_and_cookie_settings',
  },
  {
    up: migration_20260911_115955_cookie_banner_body.up,
    down: migration_20260911_115955_cookie_banner_body.down,
    name: '20260911_115955_cookie_banner_body',
  },
  {
    up: migration_20260911_121048_cookie_banner_body_rich_text.up,
    down: migration_20260911_121048_cookie_banner_body_rich_text.down,
    name: '20260911_121048_cookie_banner_body_rich_text',
  },
  {
    up: migration_20260911_135539_localization.up,
    down: migration_20260911_135539_localization.down,
    name: '20260911_135539_localization',
  },
  {
    up: migration_20260911_141700_language_settings.up,
    down: migration_20260911_141700_language_settings.down,
    name: '20260911_141700_language_settings'
  },
];
