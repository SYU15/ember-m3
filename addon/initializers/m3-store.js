import DS from 'ember-data';
import DataAdapter from '@ember/debug/data-adapter';
import { inject } from '@ember/service';
import { get } from '@ember/object';
import { IS_RECORD_DATA } from 'ember-compatibility-helpers';
import MegamorphicModel from '../model';
import M3RecordData from '../record-data';
import MegamorphicModelFactory from '../factory';
import QueryCache from '../query-cache';
import { flushChanges } from '../utils/notify-changes';

export let recordDataToRecordMap = new WeakMap();
//TODO we should figure out a place for QC to live
export let recordDataToQueryCache = new WeakMap();

const STORE_OVERRIDES = {
  _schemaManager: inject('m3-schema-manager'),

  init() {
    this._super(...arguments);
    this._queryCache = new QueryCache({ store: this });
    this._globalM3CacheRD = new Object(null);
    this._recordDataToRecordMap = recordDataToRecordMap;
  },

  // Store hooks necessary for using a single model class
  _hasModelFor(modelName) {
    return get(this, '_schemaManager').includesModel(modelName) || this._super(modelName);
  },

  _modelFactoryFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return MegamorphicModelFactory;
    }
    return this._super(modelName);
  },

  _relationshipsDefinitionFor: function(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return Object.create(null);
    }
    return this._super(modelName);
  },

  _attributesDefinitionFor: function(modelName, id) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return this.recordDataFor(modelName, id).attributesDef();
    }
    return this._super(modelName);
  },

  adapterFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return this._super('-ember-m3');
    }
    return this._super(modelName);
  },

  serializerFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return this._super('-ember-m3');
    }
    return this._super(modelName);
  },

  instantiateRecord(modelName, createOptions, recordData) {
    recordDataToQueryCache.set(recordData, this._queryCache);
    // TODO NOW deal with this
    if (get(this, '_schemaManager').includesModel(modelName)) {
      delete createOptions.container;
      delete createOptions.currentState;
      delete createOptions._internalModel;
      createOptions._recordData = recordData;
      let model = new MegamorphicModel(createOptions);
      //recordDataToRecordMap.set(recordData, model);
      return model;
    }
    return this._super(modelName, createOptions);
  },

  /**
   * A thin wrapper around the API response that knows how to look up references
   *
   * @param {string} url The URL path to query
   * @param {Object} options
   * @param {string} [options.method=GET] The HTTP method to use
   * @param {Object} [options.params] The parameters to include
   * @param {string} [options.cacheKey] A string to uniquely identify this request
   * @param {boolean} [options.reload=false] If true, issue a request even a cached value exists
   * @param {boolean} [options.backgroundReload=false] If true and a cached value exists,
   * issue a non-blocking request but immediately fulfill with the cached value
   * @returns {Promise<M3RecordData|RecordArray,Error>} Promise for loading `url` that fulfills to
   * an `M3RecordData` if the response is a single resource or a `RecordArray` of `M3RecordData`s
   * if the response is an array of resources
   */
  queryURL(url, options) {
    return this._queryCache.queryURL(url, options);
  },

  cacheURL(cacheKey, result) {
    return this._queryCache.cacheURL(cacheKey, result);
  },

  /**
   * Manually unload the cached response identified by cacheKey
   *
   * @param {string} cacheKey
   * @returns
   */
  unloadURL(cacheKey) {
    return this._queryCache.unloadURL(cacheKey);
  },

  /**
   * Check existence of the cachedKey in cache
   *
   * @param {string} cacheKey
   * @returns {boolean}
   */
  containsURL(cacheKey) {
    return this._queryCache.contains(cacheKey);
  },

  // override _push to batch change notifications which we're obliged to do
  // since all our properties are treated as volatiles as they come from
  // `unknownProperty`
  _push(jsonApiDoc) {
    let result = this._super(jsonApiDoc);
    flushChanges(this);
    return result;
  },
};

function createRecordDataFor(modelName, id, clientId, storeWrapper) {
  let schemaManager = get(this, '_schemaManager');
  if (schemaManager.includesModel(modelName)) {
    return new M3RecordData(
      modelName,
      id,
      clientId,
      storeWrapper,
      schemaManager,
      null,
      null,
      this._globalM3CacheRD
    );
  }

  return this._super(modelName, id, clientId, storeWrapper);
}

if (IS_RECORD_DATA) {
  STORE_OVERRIDES.createRecordDataFor = createRecordDataFor;
} else {
  STORE_OVERRIDES.createModelDataFor = createRecordDataFor;
}

extendStore(DS.Store);
extendDataAdapter(DataAdapter);

/**
 * @param {DS.Store} Store ember-data Store to be extended
 */
export function extendStore(Store) {
  Store.reopen(STORE_OVERRIDES);
}

/**
 * @param {DataAdapter} DataAdapter
 */
export function extendDataAdapter(DataAdapter) {
  DataAdapter.reopen({
    _schemaManager: inject('m3-schema-manager'),

    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: '-ember-m3',
      });
    },

    _nameToClass(modelName) {
      if (get(this, '_schemaManager').includesModel(modelName)) {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    },
  });
}

export function initialize() {}

export default {
  name: 'm3-store',
  initialize,
};
