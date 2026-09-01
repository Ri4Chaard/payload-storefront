import * as migration_20260827_101931_initial from './20260827_101931_initial';
import * as migration_20260828_161241_catalog from './20260828_161241_catalog';
import * as migration_20260901_104008_shop_accordion_titles from './20260901_104008_shop_accordion_titles';

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
    name: '20260901_104008_shop_accordion_titles'
  },
];
