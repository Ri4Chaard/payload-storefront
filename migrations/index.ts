import * as migration_20260827_101931_initial from './20260827_101931_initial';

export const migrations = [
  {
    up: migration_20260827_101931_initial.up,
    down: migration_20260827_101931_initial.down,
    name: '20260827_101931_initial'
  },
];
