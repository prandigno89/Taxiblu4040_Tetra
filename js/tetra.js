 
    /**
     * A+ Promises polyfill
     *   https://github.com/taylorhakes/promise-polyfill
     */
    (function () {
        root = window;
       // if (typeof window === 'object' && window) {
         //  root = window;
       // } else {
        //    root = global;
        //}

        // Use polyfill for setImmediate for performance gains
        var asap = Promise.immediateFn || root.setImmediate || function (fn) {
            setTimeout(fn, 1);
        };

        // Polyfill for Function.prototype.bind
        function bind(fn, thisArg) {
            return function () {
                fn.apply(thisArg, arguments);
            }
        }

        var isArray = Array.isArray || function (value) {
            return Object.prototype.toString.call(value) === "[object Array]"
        };

        function Promise(fn) {
            if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
            if (typeof fn !== 'function') throw new TypeError('not a function');
            this._state = null;
            this._value = null;
            this._deferreds = []

            doResolve(fn, bind(resolve, this), bind(reject, this))
        }

        function handle(deferred) {
            var me = this;
            if (this._state === null) {
                this._deferreds.push(deferred);
                return
            }
            asap(function () {
                var cb = me._state ? deferred.onFulfilled : deferred.onRejected
                if (cb === null) {
                    (me._state ? deferred.resolve : deferred.reject)(me._value);
                    return;
                }
                var ret;
                try {
                    ret = cb(me._value);
                }
                catch (e) {
                    deferred.reject(e);
                    return;
                }
                deferred.resolve(ret);
            })
        }

        function resolve(newValue) {
            try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
                if (newValue === this) throw new TypeError('A promise cannot be resolved with itself.');
                if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                    var then = newValue.then;
                    if (typeof then === 'function') {
                        doResolve(bind(then, newValue), bind(resolve, this), bind(reject, this));
                        return;
                    }
                }
                this._state = true;
                this._value = newValue;
                finale.call(this);
            } catch (e) {
                reject.call(this, e);
            }
        }

        function reject(newValue) {
            this._state = false;
            this._value = newValue;
            finale.call(this);
        }

        function finale() {
            for (var i = 0, len = this._deferreds.length; i < len; i++) {
                handle.call(this, this._deferreds[i]);
            }
            this._deferreds = null;
        }

        function Handler(onFulfilled, onRejected, resolve, reject) {
            this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
            this.onRejected = typeof onRejected === 'function' ? onRejected : null;
            this.resolve = resolve;
            this.reject = reject;
        }

        /**
         * Take a potentially misbehaving resolver function and make sure
         * onFulfilled and onRejected are only called once.
         *
         * Makes no guarantees about asynchrony.
         */
        function doResolve(fn, onFulfilled, onRejected) {
            var done = false;
            try {
                fn(function (value) {
                    if (done) return;
                    done = true;
                    onFulfilled(value);
                }, function (reason) {
                    if (done) return;
                    done = true;
                    onRejected(reason);
                })
            } catch (ex) {
                if (done) return;
                done = true;
                onRejected(ex);
            }
        }

        Promise.prototype['catch'] = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.prototype.then = function (onFulfilled, onRejected) {
            var me = this;
            return new Promise(function (resolve, reject) {
                handle.call(me, new Handler(onFulfilled, onRejected, resolve, reject));
            })
        };

        Promise.all = function () {
            var args = Array.prototype.slice.call(arguments.length === 1 && isArray(arguments[0]) ? arguments[0] : arguments);

            return new Promise(function (resolve, reject) {
                if (args.length === 0) return resolve([]);
                var remaining = args.length;

                function res(i, val) {
                    try {
                        if (val && (typeof val === 'object' || typeof val === 'function')) {
                            var then = val.then;
                            if (typeof then === 'function') {
                                then.call(val, function (val) {
                                    res(i, val)
                                }, reject);
                                return;
                            }
                        }
                        args[i] = val;
                        if (--remaining === 0) {
                            resolve(args);
                        }
                    } catch (ex) {
                        reject(ex);
                    }
                }

                for (var i = 0; i < args.length; i++) {
                    res(i, args[i]);
                }
            });
        };

        Promise.resolve = function (value) {
            if (value && typeof value === 'object' && value.constructor === Promise) {
                return value;
            }

            return new Promise(function (resolve) {
                resolve(value);
            });
        };

        Promise.reject = function (value) {
            return new Promise(function (resolve, reject) {
                reject(value);
            });
        };

        Promise.race = function (values) {
            return new Promise(function (resolve, reject) {
                for (var i = 0, len = values.length; i < len; i++) {
                    values[i].then(resolve, reject);
                }
            });
        };
        
         root.Promise = Promise;
      
      //  if (typeof module !== 'undefined' && module.exports) {
        //   module.exports = Promise;
       // } else if (!root.Promise) {
        //    root.Promise = Promise;
        //}
    })();
/**
 * @name Tetra
 * @version 1.4.1
 * @author Nicolas RAIBAUD
 * @author Luis NOVO
 * @description Tetra bridge library
 */

(function (window, document) {
    //'use strict';

    var tetra, services, events, http, opts, promise;

    /**
     * @name opts
     * @object
     * @description Defines the option parameters for the services
     */
    opts = {
        url: 'http://terminal.ingenico.com/service', // 'http://localhost:3003/service',
        waasUrl: 'http://terminal.ingenico.com'
    },
    /**
     * @name http
     * @function object
     * @description Defines the http helper functions to use by the services
     */
        http = {
            // Parsses the data to send to a post request
            parse: function (data) {
                var d, buffer = [];

                // adds each property
                for (d in data) {
                    if (data.hasOwnProperty(d)) {
                        buffer.push(d + '=' + data[d]);
                    }
                }

                // returns the value
                return encodeURI(buffer.join('&'));
            },

            // Creates an ajax call to a given url
            ajax: function (method, url, data, callback, error, timeout, async, expect) {

                // Creates the request and opens it
                var xmlreq = new XMLHttpRequest();
                xmlreq.open(method, url, async);

                // If the request is a post it parses the data if it exists
                if (method === 'POST' || method === 'PUT') {
                    data = data && (typeof data === 'string' ? data : JSON.stringify(data));
                    //data = data.replace(/\\\\/g, "\\");
                }

                // Sets the callback
                xmlreq.onreadystatechange = function () {

                    var response;

                    function onError () {
                        error && error({
                            msg: xmlreq.statusText || ('XMLHttpRequest error status ' + xmlreq.status),
                            status: xmlreq.status,
                            response: response
                        });
                    }

                    function onSuccess () {
                        callback && callback(response);
                    }

                    // When the request is completed, clears the listener and returns the callback
                    if (xmlreq.readyState === 4) {
                        xmlreq.onreadystatechange = null;

                        // if the request was sucessfull, returns the response
                        if (xmlreq.status === 200 || xmlreq.status === 204) {

                            response = xmlreq && xmlreq.responseText ? JSON.parse(xmlreq.responseText) : null;

                            if (expect && typeof expect === 'function') {
                                // Expect test successfull
                                if (expect(response)) {
                                    onSuccess();
                                } else { // Expect Failed
                                    onError();
                                }

                                return;
                            }

                            // Has error in return
                            if (response && response.return) {
                                onError();
                            }
                            else { // We expect nothing
                                onSuccess();
                            }
                        }

                        // if not, returns an error
                        else {
                            onError();
                        }
                    }
                };

                // it sets the timeout if passed
                if (timeout) {
                    xmlreq.timeout = timeout;
                }

                xmlreq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

                // Sends the data
                xmlreq.send(data);
            },

            // Override for the post method
            post: function (url, data, callback, error, timeout, expect) {
                this.ajax('POST', url, data, callback, error, timeout, true, expect);
            },

            // Override for the get method
            get: function (url, callback, error, timeout) {
                this.ajax('GET', url, null, callback, error, timeout, true);
            },

            // Override for the delete method
            del: function (url, data, callback, error, timeout, async) {
                this.ajax('DELETE', url, data, callback, error, timeout, async);
            },

            // Override for the put method
            put: function (url, data, callback, error, timeout) {
                this.ajax('PUT', url, data, callback, error, timeout, true);
            }
        },
        services = [], // Private Services instances
        events = {}, // Private events,
        promise = null; // Tetra promises

    /***
     *
     * Get the timeout value
     *
     * @param timeout
     * @returns {*|timeout|Number|XMLHttpRequest.timeout}
     */
    function getTimeout (timeout) {
        return timeout || this.timeout || this.requestTimeout;
    }

    /***
     *
     * Get the delay value
     *
     * @param delay
     * @returns {*|number}
     */
    function getDelay (delay) {
        return delay || this.delay || this.requestDelay;
    }

    /***
     *
     * Get the delay value
     *
     * @param delay
     * @returns {*|number}
     */
    function getThen (then) {
        return then || this.then;
    }

    /***
     *
     * Define a service
     *
     * @param serviceName
     * @param options
     * @returns {{evtSource: window.EventSource, delay: (*|number), timeout: (*|timeout|Number|XMLHttpRequest.timeout), call: call, connect: connect, disconnect: disconnect, then: then, catch: catch, success: success, error: error, trigger: trigger, on: on, off: off, resolve: resolve, reject: reject, destroy: destroy}}
     * @constructor
     */
    var Service = function (options) {
        var me, sse, serviceName, namespace, formats, hidden;

        options = options || {},
            sse = {},
            hidden = false,
            serviceName = options.service,
            namespace = options.namespace,
            formats = options.formats;

        return me = {
            serviceName: serviceName,
            connected: false,
            promise: null,
            evtSource: null,
            handler: {
                resolve: null,
                reject: null,
                promise: null
            },
            requestDelay: options.requestDelay || tetra.requestDelay,
            requestTimeout: options.requestTimeout || tetra.requestTimeout,
            /***
             *
             * Connect to service
             *
             * @param options
             * @returns {me}
             */
            connect: function (options) {

                options = options || {};

                // Call by default on reject
                options.then = options.then || 'both';

                // Creates a promise
                this.doPromise(options, function (onSuccess, onError, timeout) {
                    if (!me.connected) {
                        var onSuccessWrapper = function (response) {
                            me.connected = true;
                            return onSuccess(response);
                        };

                        // Pass formats
                        var formatsParameters = '';
                        for (format in formats) {
                            formatsParameters += 'format_' + (namespace || '') + '.' + format + '=' + formats[format] + '&';
                            //format_ingenico.device.chip.AidRegsterRequest.bytes 
                            /*
                             "formats":{
                             "AidRegsterRequest.bytes":"tlv"
                             }
                             */
                        }

                        // Connect to service
                        return http.get(opts.url + '/' + serviceName + '?' + formatsParameters, onSuccessWrapper, onError, timeout);
                    } else {
                        console.info('Already connected');
                        return onSuccess();
                    }
                });

                return this;
            },
            /***
             *
             * Disconnect from service
             *
             * @param options
             * @returns {me}
             */
            disconnect: function (options) {

                options = options || {};

                // Call by default on both
                options.then = options.then || 'both';

                // Creates promise
                this.doPromise(options, function (onSuccess, onError, timeout) {
                    if (me.connected) {
                        var onSuccessWrapper = function (response) {
                            me.connected = false;
                            return onSuccess(response);
                        };

                        return http.del(opts.url + '/' + serviceName, {}, onSuccessWrapper, onError, timeout, options.async === false ? false : true);
                    } else {
                        console.info('Not connected');
                        return onSuccess();
                    }
                });

                return this;
            },
            /***
             *
             * Call a a service method
             *
             * @param methodName
             * @param options
             * @returns {me}
             */
            call: function (methodName, options) { // all options can be override here for this method

                options = options || {};

                // Call by default on resolved
                options.then = options.then || 'resolved';

                // Add a promise only if we are connected

                // Creates promise
                this.doPromise(options, function (onSuccess, onError, timeout) {
                    if (me.connected) {
                        // Creates the request params
                        var req  = (namespace ? namespace + '.' : '') + methodName + 'Request',
                            res  = (namespace ? namespace + '.' : '') + methodName + 'Response',
                            data = options.data || {};

                        // todo implement new RPC version
//   http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.ManageTransaction ?
// >>> http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.Chip/start 

                        if (options.hide) {
                            hidden = true;
                            //  tetra.hide();
                        }

                        var onSuccessWrapper = function (response) {
                            if (hidden) {
                                hidden = false;
                                tetra.show();
                            }
                            return onSuccess(response);
                        };

                        var onErrorWrapper = function (response) {
                            if (hidden) {
                                hidden = false;
                                tetra.show();
                            }
                            return onError(response);
                        };

                        // Call the service method
                        return http.post(opts.url + '/' + serviceName + '?request=' + req + '&response=' + res, data, onSuccessWrapper, onErrorWrapper, timeout, options.expect);
                    } else {
                        return onError({msg: 'Not connected call'});
                    }
                });

                return this;
            },
            doPromise: function (options, fn) {
                return tetra.doPromise.apply(this, [options, fn]);
            },
            reset: function () {
                return tetra.reset.call(this);
            },
            then: function (onSuccess, onError) {
                return tetra.then.call(this, onSuccess, onError);
            },
            catch: function (error) {
                return tetra.then.call(this, null, error);
            },
            success: function (success) {
                return tetra.then.call(this, success, null);
            },
            error: function (error) {
                return tetra.then.call(this, null, error);
            },
            resolve: function (response) {
                return tetra.resolve.call(this, response, me.handler);
            },
            reject: function (reason) {
                return tetra.reject.call(this, reason, me.handler);
            },
            /***
             *
             * Add service envent, sse event
             *
             * @param eventName
             * @param callback
             * @param context
             * @returns {me}
             */
            on: function (eventName, callback, context) {

                if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                    eventName = (namespace ? namespace + '.' : '') + eventName;
                }

                options = options || {};

                // Call by default on resolved
                options.then = options.then || 'resolved';

                // Creates promise
                this.doPromise(options, function (onSuccess, onError, timeout) {

                    if (!me.evtSource) {
                        return onError();
                    }

                    context = context || me;

                    sse[eventName] = {
                        eventName: eventName,
                        callback: callback,
                        context: context
                    };

                    // Add SSE event to SSE object
                    // me.evtSource.addEventListener(eventName, sse[eventName].callback.bind(context), false);
                    me.evtSource.addEventListener(eventName, function (response) {
                        var data = JSON.parse(response.data);
                        sse[eventName].callback.call(context, data);
                    }, false);

                    return onSuccess();
                });

                return this;
            },
            /***
             *
             * Open sse
             *
             */
            open: function (options) {

                options = options || {};

                // Call by default on resolved
                options.then = options.then || 'resolved';

                // Creates promise
                this.doPromise(options, function (onSuccess, onError, timeout) {

                    if (me.connected && !me.evtSource) {

                        me.evtSource = new window.EventSource(opts.url + '/' + serviceName + '/sse');
                        // Does not works on terminal ?!
                        me.evtSource.onerror = function (e) {
                            return onError(e);
                        };
                        me.evtSource.onopen  = function (e) {
                            return onSuccess(e);
                        };

                        return onSuccess();
                    }
                    else {
                        return onError({msg: 'Not connected or event already opened'});
                    }

                });

                return this;
            },
            /***
             *
             * Close sse
             *
             */
            close: function (options) {
                options = options || {};

                // Call by default on resolved
                options.then = options.then || 'resolved';

                if (!me.evtSource) {
                    return this;
                }

                // Creates promise
                this.doPromise(options, function (onSuccess, onError, timeout) {
                    if (me.evtSource) {
                        me.off();
                        me.evtSource.close();
                        me.evtSource = null;

                        return onSuccess();
                    } else {
                        return onError({'msg': 'Event source not exist'});
                    }
                });

                return this;
            },
            /***
             *
             * Remove service event, sse event
             *
             * @param eventName
             * @returns {me}
             */
            off: function (eventName, handler, context) {

                if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                    eventName = (namespace ? namespace + '.' : '') + eventName;
                }

                if (!me.evtSource) {
                    return this;
                }

                function remove (eventName) {

                    // Remove event
                    me.evtSource.removeEventListener(eventName, handler || sse[eventName].callback, false);

                    // Delete object
                    delete sse[eventName];
                }

                if (!eventName) { // Remove all events
                    for (var evt in sse) {
                        var evtName;

                        evtName = sse[evt].eventName;

                        // Remove event
                        remove(evtName);
                    }
                }
                else if (typeof eventName === 'string') { // Remove string event
                    remove(eventName);
                } else if (typeof eventName === 'object' && eventName instanceof Array) { // Remove array of events
                    for (var i = 0, len = eventName.length; i < len; i++) {
                        var evtName;

                        evtName = eventName[i];

                        // Remove event
                        remove(evtName);
                    }
                } else {

                    for (var evt in sse) { // Remove regex
                        var evtName;

                        evtName = sse[evt].eventName;

                        if (evtName.match(eventName)) {
                            // Remove event
                            remove(evtName);
                        }
                    }
                }

                return this;
            },
            /***
             *
             * Destroy the service
             *
             */
            destroy: function () {
                var service;

                this
                    .disconnect()
                    .close({success: this.reset});

                service = services.indexOf(this);
                services.splice(service, 1);
            }
        };
    };

    tetra = {
        version: '1.4.1',
        requestDelay: 0, //  Delay between requests
        requestTimeout: 0,  // ajax timeout request
        handler: {
            resolve: null,
            reject: null,
            promise: null
        },
        setup: function (properties, callback) {

            var serviceUrl = "http://terminal.ingenico.com/setup";

            function agregate (response) {
                // Agregate properties with Tetra properties
                response.requestDelay   = tetra.requestDelay;
                response.requestTimeout = tetra.requestTimeout;
            }

            // Deprecated since 1.1.0
            if (callback && typeof callback === "function") {

                console.warn("Deprecated since 1.1.0");

                var options;

                if (typeof properties === 'function') {
                    http.get(serviceUrl, function (response) {
                        agregate(response);
                        return properties(response);
                    });

                } else if (typeof properties === 'object') {

                    options = JSON.parse(JSON.stringify(properties));

                    // Setup Tetra properties;
                    tetra.requestDelay   = options.requestDelay || tetra.requestDelay;
                    tetra.requestTimeout = options.requestTimeout || tetra.requestTimeout;

                    delete options.requestDelay;
                    delete options.requestTimeout;

                    http.post(serviceUrl, options, callback);
                }

            } else {

                properties = properties || {};

                // Call by default on both
                properties.then = properties.then || 'both';

                if (properties && properties.data) {

                    var data = JSON.parse(JSON.stringify(properties.data));

                    // Setup Tetra properties;
                    tetra.requestDelay   = properties.data.requestDelay || tetra.requestDelay;
                    tetra.requestTimeout = properties.data.requestTimeout || tetra.requestTimeout;

                    delete data.requestDelay;
                    delete data.requestTimeout;

                    // Creates a promise
                    this.doPromise(properties, function (onSuccess, onError, timeout) {
                        // Connect to service
                        return http.post(serviceUrl, data, onSuccess, onError, timeout);
                    });
                } else {
                    // Creates a promise
                    this.doPromise(properties, function (onSuccess, onError, timeout) {
                        // Connect to service
                        return http.get(serviceUrl, onSuccess, onError, timeout);
                    });
                }
            }

            return this;
        },
        /***
         *
         * Creates a new Serice instance
         *
         * @param serviceName
         * @param options
         * @returns {Service}
         */
        service: function (options) {

            var service;

            // Trow an error if we does not have serviceName
            if (!options.service) {
                return new Error('.service property is missing');
            }

            // Creates a new service
            service = new Service(options);

            // Register the new service as private
            services.push(service);

            return service;
        },
        /**
         * Disconnect all services
         * */
        disconnect: function () {

            for (var i = 0, len = services.length; i < len; i++) {
                var service;

                service = services[i];

                // Disconnect service
                if (service.connected) {

                    http.del(opts.url + '/' + service.serviceName, {},
                        function () {
                        }
                        , function () {
                        },
                        service.requestTimeout, false);
                }

            }
            return this;
        },
        /**
         * Destroy all services
         * */
        destroy: function () {
            for (var i = 0, len = services.length; i < len; i++) {
                var service;

                service = services[i];

                // Destroy service
                service.destroy();
            }
            return this;
        },
        /**
         * Creates a lookup call for a specific interface
         * */
        /* interface lookup: namespace + interfaceName (Services)
         Namespace: ingenico.device.buzzer
         Service: Buzzer
         interfaceName: => Namespace + '.' + Service => ingenico.device.buzzer.Buzzer
         */
        lookup: function (interfaceName, callback) {

            // Deprecated since 1.1.0
            if (callback && typeof callback === "function") {

                console.warn("Deprecated since 1.1.0");

                interfaceName && http.get(opts.url + "?interface=" + interfaceName, callback);
            } else {
                var options = callback || {};

                // Call by default on both
                options.then = options.then || 'both';

                // Creates a promise
                this.doPromise(options, function (onSuccess, onError, timeout) {
                    // Connect to service
                    return http.get(opts.url + "?interface=" + interfaceName, onSuccess, onError, timeout);
                });

            }

            return this;
        },
        hide: function () { // Hide layer
            console.log("INGENICO:WCE:hide");
        },
        show: function () { // Show layer
            console.log("INGENICO:WCE:show");
        },
        hideWP: function () { // Hide layer
            console.log("INGENICO:WCE:hideWP");
        },
        showWP: function () { // Show layer
            console.log("INGENICO:WCE:showWP");
        },
        weblet: {
            hide: function () { // Hide weblet
                console.log("INGENICO:WEBLET:hide");

                return this;
            },
            show: function () { // Show weblet
                console.log("INGENICO:WEBLET:show");

                return this;
            },
            notify: function (data) { // Notify weblet

                data = data || {};

                var badge = data.badge || 'default';
                var count = data.count || 0;
                var save  = data.save || false;
                var id    = data.id ? ':' + data.id : '';

                console.log("INGENICO:NOTIFY:" + badge + ":" + count + ":" + save + id);
                return this;
            },
            /***
             *
             * Add window tetra event
             *
             * @param eventName
             * @param callback
             * @param context
             * @returns {tetra}
             */
            on: function (eventName, callback, context) {

                // Manually start since 1.4.1
                if(eventName === 'wakeup') {
                    tetra.createWakeupEvent();
                }

                context = context || this;

                // Register event as private
                events[eventName] = {
                    eventName: eventName,
                    callback: callback.bind(context),
                    context: context
                };

                // Add listerner to window
                window.addEventListener(eventName, events[eventName].callback, false);

                return this;
            },
            /***
             *
             *  Trigger window tetra event
             *
             * @param eventName
             * @returns {tetra}
             */
            trigger: function (eventName, data) {

                data = data || {};

                function dispatch (eventName) {
                    var event;

                    event = new CustomEvent(eventName, data);

                    // Dispatch event
                    window.dispatchEvent(event);
                }

                if (!eventName) { // Trigger all events
                    for (var evt in events) { // Remove regex
                        var evtName;
                        evtName = events[evt].eventName;

                        // Dispatch event
                        dispatch(evtName);
                    }
                } else if (typeof eventName === 'string') { // Triggered string event
                    dispatch(eventName);
                } else if (typeof eventName === 'object' && eventName instanceof Array) { // Triggered array of events
                    for (var i = 0, len = eventName.length; i < len; i++) {

                        // Dispatch event
                        dispatch(eventName[i]);
                    }
                } else {
                    for (var evt in events) { // Triggered regex
                        var evtName;
                        evtName = events[evt].eventName;
                        if (evtName.match(eventName)) {

                            // Dispatch event
                            dispatch(evtName);
                        }
                    }
                }

                return this;
            },
            /**
             * Remove window tetra events
             * */
            off: function (eventName, handler, context) {
                function remove (eventName) {
                    // Remove event listenner from window
                    window.removeEventListener(eventName, handler || events[eventName].callback, false);

                    // Delete object
                    delete events[eventName];
                }

                if (!eventName) { // Remove all events
                    for (var evt in events) {
                        var evtName;
                        evtName = events[evt].eventName;
                        // Remove event
                        remove(evtName);
                    }
                } else if (typeof eventName === 'string') { // Remove string event

                    // Remove event
                    remove(eventName);
                } else if (typeof eventName === 'object' && eventName instanceof Array) { // Remove array of events
                    for (var i = 0, len = eventName.length; i < len; i++) {
                        // Remove event
                        remove(eventName[i]);
                    }
                } else {
                    for (var evt in events) { // Remove regex
                        var evtName;
                        evtName = events[evt].eventName;
                        if (evtName.match(eventName)) {
                            // Remove event
                            remove(evtName);
                        }
                    }
                }

                return this;
            }
        },
        waas: function (interfaceName) {

            var service, evtSource, events;

            events = [];

            function Waas () {

                var Send = function (method) {
                    this.sendResponse = function (data, callback, error, timeout, expect) {
                        http.post(opts.waasUrl + '/waas/' + interfaceName + '/' + method, data || {}, callback, error, timeout, expect);
                        return this;
                    };
                };

                return {
                    sendEvent: function (eventName, data, callback, error, timeout, expect) {
                        http.post(opts.waasUrl + '/waas/' + eventName, data || {}, callback, error, timeout, expect);
                        return this;
                    },
                    on: function (eventName, properties, callBack) {

                        if (properties && typeof properties === 'function') {
                            callBack   = properties;
                            properties = {};
                        }

                        events.push({
                            eventName: eventName,
                            properties: properties,
                            callBack: callBack
                        });

                        return this;
                    },
                    start: function () {

                        var params;

                        params = '?';

                        for (var i = 0, len = events.length; i < len; i++) {
                            var event      = events[i];
                            var properties = event.properties;
                            var eventName  = event.eventName;

                            // Add perms parameters
                            if (properties.perms && typeof properties.perms === 'object' && properties.perms instanceof Array) {
                                params += 'perms_' + eventName + '=' + properties.perms.toString() + '&';
                            }

                            // Add format parameters
                            if (properties.formats) {
                                var namespace = interfaceName.split('.');
                                namespace     = namespace[0] + '.' + namespace[1];

                                var UpperEventName = eventName[0].toUpperCase() + eventName.slice(1);

                                for (format in properties.formats) {
                                    params += 'format_' + namespace + '.' + UpperEventName + format + '=' + properties.formats[format] + '&';
                                }
                            }

                        }

                        // Create event source
                        evtSource = new window.EventSource(opts.waasUrl + '/waas/' + interfaceName + params);

                        // Add event listeners
                        for (var i = 0, len = events.length; i < len; i++) {
                            var event = events[i];
                            var send  = new Send(event.eventName);
                            evtSource.addEventListener(event.eventName, event.callBack.bind(send), false);
                        }

                        return this;
                    }
                };
            }

            service = new Waas(interfaceName);

            return service;

        },
        /***
         *
         * Creates a promise
         *
         * @param options
         * @param fn
         */
        doPromise: function (options, fn) {

            var me = this;

            function doPromise () {

                var promise;

                // Creates a new promise
                promise = new window.Promise(function (resolve, reject) {


                    // Call the promise after a delay
                    window.setTimeout(function () {

                        return fn(function (response) {

                            // Register Handler
                            me.handler.resolve = resolve;
                            me.handler.reject  = reject;
                            me.handler.promise = promise;

                            me.resolve(response, me.handler);

                        }, function (reason) {

                            // Register Handler
                            me.handler.resolve = resolve;
                            me.handler.reject  = reject;
                            me.handler.promise = promise;

                            me.reject(reason, me.handler);

                        }, getTimeout.call(me, options.requestTimeout)); // Pass AJAX timeout for service call

                    }, getDelay.call(me, options.requestDelay));

                });

                return promise;
            }

            if (!this.promise || options.promise) {
                this.promise = doPromise();
            } else {
                var then = getThen.call(me, options.then);
                if (then === 'resolved') {
                    me.success(doPromise)
                } else if (then === 'rejected') {
                    me.error(doPromise)
                } else {
                    me.then(doPromise, doPromise);
                }

            }

            if (options.error || options.success) {
                me.then(options.success, options.error);
            }

            return this;
        },
        then: function (onSuccess, onError) {

            var me = this;

            if (onSuccess && !onError) {
                me.promise = me.promise.then(function (response) {
                    return onSuccess.call(me, response, me.handler);
                    // return me.promise;
                });
            } else if (onSuccess && onError) {

                me.promise = me.promise.then(function (response) {

                        return onSuccess.call(me, response, me.handler);
                        //return me.promise;
                    },
                    function (reason) {
                        return onError.call(me, reason, me.handler);
                        //   return me.promise;
                    }
                );
            }
            else {
                me.promise = me.promise.catch(function (reason) {
                    return onError.call(me, reason, me.handler);
                    //  return me.promise;
                });
            }

            return this;
        },
        /***
         *
         * Catch promise method
         *
         * @param error
         * @returns {me}
         */
        catch: function (error) {
            this.then(null, error);
            return this;
        },
        /***
         *
         * Success sugar for resolved promise
         *
         * @param success
         * @returns {me}
         */
        success: function (success) {
            this.then(success, null);
            return this;
        },
        /***
         *
         * Error sugar for rejected promise
         *
         * @param error
         * @returns {me}
         */
        error: function (error) {
            this.then(null, error);
            return this;
        },
        /***
         *
         * Resolve the current promise
         *
         * @param response
         * @returns {me}
         */
        resolve: function (response) {
            this.handler.resolve.call(this, response, this.handler);
            return this;
        },
        /***
         *
         * Reject the current promise
         *
         * @param reason
         * @returns {me}
         */
        reject: function (reason) {
            this.handler.reject.call(this, reason, this.handler);
            return this;
        },
        reset: function () {
            this.promise = null;
            return this;
        },
        checkServices: function (services, options) {
            var _services, me, tried, resolvePromise, rejectPromise;

            options = options || {};

            options.delay = options.delay || 1000;
            options.try   = options.try || 20;
            options.then  = options.then || 'both';

            me = this,
                tried = 0,
                _services = services.slice(0);

            function onSuccessWrapper () {
                _services.shift();
                tried = 0;
                check();
            }

            function onErrorWrapper () {
                tried++;
                setTimeout(check, options.delay);
            }

            function check () {
                if (_services.length && tried < options.try) {
                    tetra
                        .reset()
                        .lookup(_services[0],
                        {
                            expect: function (r) {
                                return r && r.length;
                            }
                        }
                    )
                        .then(onSuccessWrapper, onErrorWrapper);

                } else {
                    if (tried === options.try) {
                        rejectPromise(_services[0]);
                    } else {
                        resolvePromise();
                    }

                }
            }

            return me.doPromise({}, function (resolve, reject) {
                resolvePromise = resolve;
                rejectPromise  = reject;
                check();
            });

        }
    };

    /**
     * Add window events
     * */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            tetra.weblet.trigger('hide');
        } else {
            tetra.weblet.trigger('show');
        }
    });

    window.addEventListener("beforeunload", function (e) {
        e.preventDefault();
        tetra.weblet.trigger('close');

        tetra.disconnect();
    });

    /*** Listen to wakeup event ***/

    tetra.createWakeupEvent = function () {

        return tetra.service({ // Instantiate desktopenv service
            service: 'local.desktopenv.inactivityHandler',
            namespace: 'ingenico.desktopenv'
        })
            .reset()
            .disconnect()
            .close()
            .connect() // Connect to service
            .open()  // Open SSE
            .on('WakeupEvent', function (r) { // listen to event
                tetra.weblet.trigger('wakeup', r.cause);
            });

    };



    // Attach tetra to global object
    if (typeof module != 'undefined' && module.exports) {
        module.exports = tetra;
    } else if (typeof window.define === "function" && window.define.amd) {
        window.define("tetra", [], function () {
            return tetra;
        });
    } else {
        window.tetra = tetra;
    }

}(window, document));