import { get } from '@ember/object';
import { dasherize } from '@ember/string';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';
import { EmbeddedMegamorphicModel } from './model';
import { resolveReferencesWithRecords } from './utils/resolve';

/**
 * M3RecordArray
 *
 * @class M3RecordArray
 * @extends DS.RecordArray
 */
export default class M3RecordArray extends ArrayProxy {
  // public RecordArray API

  init() {
    // content must be set before super.init because that will install array
    // observers
    this.content = A();
    super.init(...arguments);
    this._references = [];
    this._objects = [];
    this._resolved = false;
    this.store = this.store || null;
  }

  replace(idx, removeAmt, newRecords) {
    this.replaceContent(idx, removeAmt, newRecords);
  }

  replaceContent(idx, removeAmt, newRecords) {
    //debugger
    let addAmt = get(newRecords, 'length');
    let newObjects = new Array(addAmt);

    if (addAmt > 0) {
      let _newRecords = A(newRecords);
      for (let i = 0; i < newObjects.length; ++i) {
        newObjects[i] = _newRecords.objectAt(i);
      }
    }

    this.content.replace(idx, removeAmt, newObjects);
    this._registerWithObjects(newObjects);
    this._resolved = true;
  }

  objectAtContent(idx) {
    // TODO make this lazy again
    let record = this.content[idx];
    return record;
  }

  objectAt(idx) {
    this._resolve();
    return super.objectAt(idx);
  }

  // RecordArrayManager private api

  _pushObjects(objects) {
    //debugger
    this._resolve();
    this.content.pushObjects(objects);
  }

  _removeObjects(objects) {
    //debugger
    if (this._resolved) {
      this.content.removeObjects(objects);
    } else {
      for (let i = 0; i < objects.length; ++i) {
        let object = objects[i];

        for (let j = 0; j < this.content.length; ++j) {
          let { id, type } = this.content[j];
          let dtype = type && dasherize(type);
          // TODO we might not need the second condition
          if (
            (dtype === null ||
              dtype === object.modelName ||
              dtype === object._recordData.modelName) &&
            id === object.id
          ) {
            this.content.removeAt(j);
            break;
          }
        }
      }
    }
  }

  // Private API

  _setObjects(objects, triggerChange = true) {
    if (triggerChange) {
      this.content.replace(0, this.content.length, objects);
    } else {
      this.content.splice(0, this.content.length, ...objects);
    }

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
    });

    this._registerWithObjects(objects);
    this._resolved = true;
  }

  _setReferences(references) {
    this._references = references;
    this._resolved = false;
    // change event for this.content so we re-resolve next time something is
    // asked for
    this.content.setObjects(this._references);
  }

  _removeRecordData(recordData) {
    for (let i = this.content.length; i >= 0; --i) {
      let item = this.content.objectAt(i);
      if (item && recordData === item._recordData) {
        this.content.removeAt(i);
        break;
      }
    }
  }

  _registerWithObjects(records) {
    //debugger;
    /*
    for (let i = 0, l = objects.length; i < l; i++) {
      let object = objects[i];

      // allow refs to point to resources not in the store
      // TODO: instead add a schema missing ref hook; #254
      if (object !== null && object !== undefined) {
        object._recordArrays.add(this);
      }
    }
    */
    records.forEach(record => record && record._recordData._recordArrays.add(this));
  }

  _resolve() {
    if (this._resolved) {
      return;
    }

    if (this._references !== null) {
      let objects = resolveReferencesWithRecords(this.store, this._references);
      this._setObjects(objects, false);
    }

    this._resolved = true;
  }

  // The length property can be removed entirely once our ember-source peer dep
  // is >= 3.1.0.
  //
  // It is not safe to override a getter on a superclass that specifies a
  // setter as a matter of OO + es6 class semantics.

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }

  set length(v) {}
}

export function associateRecordWithRecordArray(record, recordArray) {
  if (record instanceof EmbeddedMegamorphicModel) {
    // embedded models can be added across tracked arrays (although this is
    // weird) but since they can't be unloaded there's no need to associate the
    // array with the model
    //
    // unloading the top model after adding one of its embedded models to some
    // other tracked array is undefined behaviour
    return;
  }
  record._recordData._recordArrays.add(recordArray);
}
