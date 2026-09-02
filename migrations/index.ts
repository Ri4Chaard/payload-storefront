import * as migration_20260827_101931_initial from './20260827_101931_initial';
import * as migration_20260828_161241_catalog from './20260828_161241_catalog';
import * as migration_20260901_104008_shop_accordion_titles from './20260901_104008_shop_accordion_titles';
import * as migration_20260901_160441_customer_accounts from './20260901_160441_customer_accounts';
import * as migration_20260901_183138_account_copy_fields from './20260901_183138_account_copy_fields';
import * as migration_20260902_081353_drop_account_copy_global from './20260902_081353_drop_account_copy_global';
import * as migration_20260902_081401_account_settings from './20260902_081401_account_settings';
import * as migration_20260902_112639_drop_marketing_enabled from './20260902_112639_drop_marketing_enabled';

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
    name: '20260902_112639_drop_marketing_enabled'
  },
];
