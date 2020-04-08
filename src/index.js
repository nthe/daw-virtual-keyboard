(function (global) {
    "use strict";
    /**
     * @function limitTo
     * @description limit number to certain range.
     * @param {number} [num] input number
     * @param {number} [min] lower limit
     * @param {number} [max] upper limit
     * @returns {number} number
     */
    var limitTo = function (num, min, max) { return Math.min(Math.max(num, min), max); };
    /**
     * Map between keys and notes.
     */
    var keyToNoteMap = {
        'a': { note: 'C', freq: 16.35 },
        'w': { note: 'C#', freq: 17.32 },
        's': { note: 'D', freq: 18.35 },
        'e': { note: 'D#', freq: 19.45 },
        'd': { note: 'E', freq: 20.60 },
        'f': { note: 'F', freq: 21.83 },
        't': { note: 'F#', freq: 23.12 },
        'g': { note: 'G', freq: 24.50 },
        'y': { note: 'G#', freq: 25.96 },
        'h': { note: 'A', freq: 27.50 },
        'u': { note: 'A#', freq: 29.14 },
        'j': { note: 'B', freq: 30.87 },
        'k': { note: 'C', freq: 32.70 },
        'o': { note: 'C#', freq: 34.65 },
        'l': { note: 'D', freq: 36.71 },
        'p': { note: 'D#', freq: 38.89 }
    };
    /**
     * Map between keys and commands.
    */
    var keyToCommandsMap = {
        'z': 'octave-down',
        'x': 'octave-up',
        'c': 'velocity-down',
        'v': 'velocity-up',
        'b': 'hold-mode'
    };
    /**
     * @constructor
     * @constructs VirtualKeyBoard
     * @description function constructor
     * @param {number} octave initial octave
     * @param {number} velocity initial velocity
     * @returns {VirtualKeyBoard} self
     */
    var VirtualKeyBoard = /** @class */ (function () {
        function VirtualKeyBoard(octave, velocity) {
            if (octave === void 0) { octave = 1; }
            if (velocity === void 0) { velocity = 100; }
            this.holdMode = false;
            this.heldKeys = {};
            this.subscribers = [];
            this.activeVoices = 0;
            this.octave = octave;
            this.velocity = velocity;
            this.activate();
        }
        /**
         * @method subscribe
         * @description register callback for subscription
         * @param {Function} callback callback method
         * @returns {VirtualKeyBoard} this
         */
        VirtualKeyBoard.prototype.subscribe = function (callback) {
            if (!(this.subscribers.indexOf(callback) < 0)) {
                return this;
            }
            this.subscribers.push(callback);
            return this;
        };
        /**
         * @method unsubscribe
         * @description un-register callback from subscription
         * @param {Function} callback callback method
         * @returns {VirtualKeyBoard} this
         */
        VirtualKeyBoard.prototype.unsubscribe = function (callback) {
            var position = this.subscribers.indexOf(callback);
            if (position < 0) {
                return this;
            }
            this.subscribers.splice(position, 1);
            return this;
        };
        /**
         * @method emit
         * @description calls callbacks of subscribers
         * @param {INoteData} data data to publish
         * @returns {INoteData} data
         */
        VirtualKeyBoard.prototype.emit = function (data) {
            this.subscribers.map(function (f) { return f(data); });
            return data;
        };
        /**
         * @method noteToFreq
         * @description converts note at specific octave to frequency
         * @param {number} freq frequency
         * @returns {number} frequency
         */
        VirtualKeyBoard.prototype.freqCorrection = function (freq) {
            return freq * Math.pow(2, this.octave);
        };
        /**
         * @method keyHandler
         * @description handles key events
         * @param {Event} event keyboard event
         */
        VirtualKeyBoard.prototype.keyHandler = function (event) {
            var key = event.key.toLowerCase();
            var note = keyToNoteMap[key];
            var command = keyToCommandsMap[key];
            if (event.type === 'keydown') {
                // check if note should be (re)triggered
                var doTrigger = !this.heldKeys.hasOwnProperty(key) || this.holdMode;
                // handle note key
                if (note && doTrigger) {
                    var voice = this.activeVoices++;
                    this.heldKeys[key] = voice;
                    var data = {
                        note: note,
                        voice: voice,
                        freq: this.freqCorrection(note.freq),
                        state: 'on'
                    };
                    this.emit({
                        action: 'date',
                        data: data
                    });
                }
                // handle command key
                if (command) {
                    var data = {};
                    switch (command) {
                        case 'octave-up':
                            this.octave = limitTo(this.octave + 1, -8, 8);
                            data = { command: command, state: this.octave };
                            break;
                        case 'octave-down':
                            this.octave = limitTo(this.octave - 1, -8, 8);
                            ;
                            data = { command: command, state: this.octave };
                            break;
                        case 'velocity-up':
                            this.velocity = limitTo(this.velocity + 5, 0, 127);
                            data = { command: command, state: this.velocity };
                            break;
                        case 'velocity-down':
                            this.velocity = limitTo(this.velocity - 5, 0, 127);
                            data = { command: command, state: this.velocity };
                            break;
                        case 'hold-mode':
                            this.holdMode = !this.holdMode;
                            data = { command: command, state: this.holdMode };
                            break;
                    }
                    if (data) {
                        this.emit({
                            action: 'settings',
                            data: data
                        });
                    }
                }
            }
            if (event.type === 'keyup') {
                // check if key was held and hold-mode is off
                var heldKey = this.heldKeys[key];
                if (typeof heldKey !== 'undefined' && !this.holdMode) {
                    delete this.heldKeys[key];
                    var data = {
                        note: note,
                        voice: heldKey,
                        freq: this.freqCorrection(note.freq),
                        state: 'off'
                    };
                    this.emit({
                        action: 'gate',
                        data: data
                    });
                }
                // reset voice indexer
                if (!Object.keys(this.heldKeys).length) {
                    this.activeVoices = 0;
                }
            }
        };
        /**
         * @method deactivate
         * @description disable keyboard
         * @returns {VirtualKeyBoard} this
         */
        VirtualKeyBoard.prototype.deactivate = function () {
            window.removeEventListener('keydown', this.keyHandler.bind(this));
            window.removeEventListener('keyup', this.keyHandler.bind(this));
            return this;
        };
        /**
         * @method activate
         * @description enable keyboard
         * @returns {VirtualKeyBoard} this
         */
        VirtualKeyBoard.prototype.activate = function () {
            window.addEventListener('keydown', this.keyHandler.bind(this));
            window.addEventListener('keyup', this.keyHandler.bind(this));
            return this;
        };
        return VirtualKeyBoard;
    }());
    ;
    global.VirtualKeyBoard = VirtualKeyBoard;
}).call(this, this);
