/**
 * Project: GameEngine.
 * Copyright (c) 2013, Eugene-Krevenets
 */

'use strict';

var Events = require('./events');
var isArray = require('./../utils/utils').isArray;
var isFunction = require('./../utils/utils').isFunction;
var isObject = require('./../utils/utils').isObject;
var mixin = require('./utils').mixin;
var PoolOfObjects = require('./poolOfObjects');

var ListIterator = function() {
  this.node = null;
};

ListIterator.prototype.hasNext = function() {
  return !!this.node;
};

ListIterator.prototype.next = function() {
  var prev = this.node;
  this.node = prev.next;
  return prev.instance;
};

/**
 *
 * @inner
 *
 * @param {Object} [name] The List name or initial array
 * @param {array} [Array] initial array
 * @constructor
 */
var List = function (name, arr) {
  this.head = this.tail = null;
  this._length = 0;

  if (isArray(name)) {
    arr = name;
    name = undefined;
  }

  if (name) {
    this.PROPERTY_LINK_TO_NODE = '_listNode_' + name;
  } else {
    this.PROPERTY_LINK_TO_NODE = '_listNode_' + Math.random();
  }

  if (isArray(arr)) {
    for(var i = 0; i < arr.length; i++) {
      this.add(arr[i]);
    }
  }
};

mixin(List.prototype, Events);

/**
 * Add instance to list
 *
 * @param {*} instance
 * @return {ListNode}
 */
List.prototype.add = function (instance) {
  var node = poolOfListNodes.get();
  node.init(instance, this.PROPERTY_LINK_TO_NODE);

  if (this.head) {
    this.tail.next = node;
    node.prev = this.tail;
    this.tail = node;
  } else {
    this.head = this.tail = node;
  }

  if (instance) {
    this.trigger('add', instance);
  } else {
    this.trigger('add', node);
  }

  this._length++;

  return node;
};

/**
 * Add instance to head
 *
 * @param {*} instance
 * @return {ListNode}
 */
List.prototype.addHead = function (instance) {
  var node = poolOfListNodes.get();
  node.init(instance, this.PROPERTY_LINK_TO_NODE);

  if (this.head) {
    this.head.prev = node;
    node.next = this.head;
    this.head = node;
  } else {
    this.head = this.tail = node;
  }

  if (instance) {
    this.trigger('add', instance);
  } else {
    this.trigger('add', node);
  }

  this._length++;

  return node;
};

List.prototype.clone = function() {
  var newList = new List();

  this.forEach(newList.add.bind(newList));

  return newList;
};

List.prototype.quickIterator = function() {
  if (!this._quickIterator) {
    this._quickIterator = new ListIterator();
  }

  this._quickIterator.node = this.head;

  return this._quickIterator;
};

/**
 * Remove {ListNode} by instance
 * @param {*} instance
 * @return {boolean}
 */
List.prototype.remove = function (instance) {
  var node;
  if (instance instanceof ListNode) {
    node = instance;
  } else {
    if (!instance._linkNode_ || !instance._linkNode_[this.PROPERTY_LINK_TO_NODE]) {
      return false;
    }

    node = instance._linkNode_[this.PROPERTY_LINK_TO_NODE];
    if (node === null) {
      return false;
    }
  }

  if (this.tail === node) {
    this.tail = node.prev;
  }

  if (this.head === node) {
    this.head = node.next;
  }

  if (node.prev !== null) {
    node.prev.next = node.next;
  }

  if (node.next !== null) {
    node.next.prev = node.prev;
  }

  node.dispose(instance, this.PROPERTY_LINK_TO_NODE);

  this.trigger('remove', instance);

  this._length--;
  return true;
};

List.prototype.value = function () {
  var arr = [];
  this.forEach(function(value) {
    arr.push(value);
  });
  return arr;
};

/**
 * Length of the list
 * @return {number}
 */
List.prototype.length = function () {
  return this._length;
};

/**
 * Execute callback for each node of the List
 *
 * @param {function} callback
 * @param context
 * @param arg
 */
List.prototype.forEach = function (callback, context, arg) {
  if (!isFunction(callback)) {
    return;
  }

  var node = this.head,
    next;
  if (context) {
    while (node) {
      next = node.next;
      callback.call(context, node.instance, arg);
      node = next;
    }
  } else if(arg) {
    while (node) {
      next = node.next;
      callback(node.instance, arg);
      node = next;
    }
  } else {
    var index = 0;
    while (node) {
      next = node.next;
      callback(node.instance, index);
      index++;
      node = next;
    }
  }
};

/**
 * Node of {List}
 *
 * @param {*} instance
 * @param {String} linkBack
 * @constructor
 */
var ListNode = function (instance, linkBack) {
  if (instance) {
    this.init(instance, linkBack);
  }
};

ListNode.prototype.instance = null;
ListNode.prototype.next = null;
ListNode.prototype.prev = null;

ListNode.prototype.init = function (instance, linkBack) {
  this.prev = this.next = null;

  if (!instance) {
    return;
  }

  this.instance = instance;

  //optimization
  //if (instance.hasOwnProperty(linkBack)) {
  if (instance._linkNode_ && instance._linkNode_[linkBack]) {
    throw new Error('Can\'t store "' + instance + '" because it contains ' + linkBack + ' property.' + instance._linkNode_[linkBack]);
  }

  if (isObject(instance)) {
    if (!instance._linkNode_) {
      instance._linkNode_ = {};
    }
    instance._linkNode_[linkBack] = this;
  }
};

/**
 * Dispose of node
 *
 * @param instance
 * @param linkBack
 */
ListNode.prototype.dispose = function (instance, linkBack) {
  this.prev = this.next = null;
  this.instance = null;

  //optimization:
  //delete instance[linkBack];
  if (instance._linkNode_) {
    instance._linkNode_[linkBack] = null;
  }
  this.onDispose();
};

var poolOfListNodes = new PoolOfObjects(ListNode).warmup(1024);

module.exports = List;

