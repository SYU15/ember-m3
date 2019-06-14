import { IS_RECORD_DATA } from 'ember-compatibility-helpers';

let recordDataMap = new WeakMap();

export function recordDataFor(record) {
  if (!record._recordData) {
    debugger;
  }
  return record._recordData;
}
