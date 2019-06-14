import { IS_RECORD_DATA } from 'ember-compatibility-helpers';

let recordDataMap = new WeakMap();

export function recordDataFor(recordOrInternalModel) {
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;

  if (!IS_RECORD_DATA) {
    return internalModel._modelData;
  }

  return internalModel._recordData;
}