import * as migration_20261118_113033_initial from './20261118_113033_initial';

export const migrations = [
  {
    up: migration_20261118_113033_initial.up,
    down: migration_20261118_113033_initial.down,
    name: '20261118_113033_initial'
  },
];
