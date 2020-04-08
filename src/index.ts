(function (global: any) {
    "use strict";

    interface IKeyValuePair {
        [key: string]: any
    }

    interface IActionData {
        note?: string;
        freq?: number;
        voice?: number;
        state?: string | number | boolean;
        command?: string;
    }

    interface INoteData {
        action: string;
        data: IActionData;
    }

    /**
     * @function limitTo
     * @description limit number to certain range.
     * @param {number} [num] input number
     * @param {number} [min] lower limit
     * @param {number} [max] upper limit
     * @returns {number} number
     */
    const limitTo = (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max);

    /**
     * Map between keys and notes.
     */
    const keyToNoteMap: IKeyValuePair = {
        'a': { note: 'C',   freq: 16.35 },
        'w': { note: 'C#',  freq: 17.32 },
        's': { note: 'D',   freq: 18.35 },
        'e': { note: 'D#',  freq: 19.45 },
        'd': { note: 'E',   freq: 20.60 },
        'f': { note: 'F',   freq: 21.83 },
        't': { note: 'F#',  freq: 23.12 },
        'g': { note: 'G',   freq: 24.50 },
        'y': { note: 'G#',  freq: 25.96 },
        'h': { note: 'A',   freq: 27.50 },
        'u': { note: 'A#',  freq: 29.14 },
        'j': { note: 'B',   freq: 30.87 },
        'k': { note: 'C',   freq: 32.70 },
        'o': { note: 'C#',  freq: 34.65 },
        'l': { note: 'D',   freq: 36.71 },
        'p': { note: 'D#',  freq: 38.89 },
    };

    /** 
     * Map between keys and commands.
    */
    const keyToCommandsMap: IKeyValuePair = {
        'z': 'octave-down',
        'x': 'octave-up',
        'c': 'velocity-down',
        'v': 'velocity-up',
        'b': 'hold-mode'
    }

    /**
     * @constructor
     * @constructs VirtualKeyBoard
     * @description function constructor
     * @param {number} octave initial octave
     * @param {number} velocity initial velocity
     * @returns {VirtualKeyBoard} self
     */
    class VirtualKeyBoard  {
    
        octave: number;
        velocity: number;
        holdMode: boolean = false;
        heldKeys: IKeyValuePair = {};
        subscribers: Function[] = [];
        activeVoices: number = 0;

        constructor (octave = 1, velocity = 100) {
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
        subscribe (callback: Function): VirtualKeyBoard {
            if(!(this.subscribers.indexOf(callback) < 0)) {
                return this;
            }
            this.subscribers.push(callback);
            return this;
        }

        /**
         * @method unsubscribe
         * @description un-register callback from subscription
         * @param {Function} callback callback method
         * @returns {VirtualKeyBoard} this
         */
        unsubscribe (callback: Function): VirtualKeyBoard {
            let position = this.subscribers.indexOf(callback);
            if (position < 0) {
                return this;
            }
            this.subscribers.splice(position, 1);
            return this;
        }

        /**
         * @method emit
         * @description calls callbacks of subscribers
         * @param {INoteData} data data to publish
         * @returns {INoteData} data
         */
        emit (data: INoteData): INoteData {
            this.subscribers.map(f => f(data));
            return data;
        }

        /**
         * @method noteToFreq
         * @description converts note at specific octave to frequency
         * @param {number} freq frequency
         * @returns {number} frequency
         */
        freqCorrection (freq: number): number {
            return freq * Math.pow(2, this.octave);
        }

        /**
         * @method keyHandler
         * @description handles key events
         * @param {Event} event keyboard event
         */
        keyHandler (event: KeyboardEvent) {
            const key = event.key.toLowerCase();
            const note = keyToNoteMap[key];
            const command = keyToCommandsMap[key];
            
            if (event.type === 'keydown') {
                // check if note should be (re)triggered
                const doTrigger = !this.heldKeys.hasOwnProperty(key) || this.holdMode;
                
                // handle note key
                if (note && doTrigger) {
                    const voice = this.activeVoices++;
                    this.heldKeys[key] = voice;
                    const data = {
                        note,
                        voice,
                        freq: this.freqCorrection(note.freq),
                        state: 'on'
                    }
                    this.emit({
                        action: 'date',
                        data
                    });
                }
                
                // handle command key
                if (command) {
                    let data: IActionData = {};
                    switch (command) {
                        case 'octave-up':
                            this.octave = limitTo(this.octave + 1, -8, 8);
                            data = { command: command, state: this.octave };
                            break;
                        case 'octave-down':
                            this.octave = limitTo(this.octave - 1, -8, 8);;
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
                            data
                        });
                    }
                }
            }
            if (event.type === 'keyup') {
                // check if key was held and hold-mode is off
                const heldKey = this.heldKeys[key];
                if (typeof heldKey !== 'undefined' && !this.holdMode) {
                    delete this.heldKeys[key];
                    
                    const data = {
                        note,
                        voice: heldKey,
                        freq: this.freqCorrection(note.freq),
                        state: 'off'
                    };
                    
                    this.emit({
                        action: 'gate',
                        data
                    });
                    
                }
                // reset voice indexer
                if (!Object.keys(this.heldKeys).length) {
                    this.activeVoices = 0;
                }
            }
        }

        /**
         * @method deactivate
         * @description disable keyboard
         * @returns {VirtualKeyBoard} this
         */
        deactivate (): VirtualKeyBoard {
            window.removeEventListener('keydown', this.keyHandler.bind(this));
            window.removeEventListener('keyup',   this.keyHandler.bind(this));
            return this;
        }

        /**
         * @method activate
         * @description enable keyboard
         * @returns {VirtualKeyBoard} this
         */
        activate (): VirtualKeyBoard {
            window.addEventListener('keydown', this.keyHandler.bind(this));
            window.addEventListener('keyup',   this.keyHandler.bind(this));
            return this;
        }
    };

    global.VirtualKeyBoard = VirtualKeyBoard;

}).call(this, this);
