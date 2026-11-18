import * as migration_20261118_120536_initial from './20261118_120536_initial';

export const migrations = [
  {
    up: migration_20261118_120536_initial.up,
    down: migration_20261118_120536_initial.down,
    name: '20261118_120536_initial'
  },
];
