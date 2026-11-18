import * as migration_20261118_100609_initial from './20261118_100609_initial';

export const migrations = [
  {
    up: migration_20261118_100609_initial.up,
    down: migration_20261118_100609_initial.down,
    name: '20261118_100609_initial'
  },
];
