'use strict';

var WstSignalingChannel = function(wssUrl, roomId, clientId) {
    this.wssUrl_ = wssUrl;
    this.roomId_ = roomId;
    this.clientId_ = clientId;
    this.registered_ = false;

    // Public callbacks. Keep it sorted.
    this.onerror = null;
    this.onmessage = null;
};

WstSignalingChannel.prototype.open = function() {
    if (this.websocket_) {
        trace('ERROR: SignalingChannel has already opened.');
        return;
    }

    trace('Opening signaling channel.');
    trace('wss url: ' + this.wssUrl_);
    return new Promise(function(resolve, reject) {
        this.websocket_ = new WebSocket(this.wssUrl_);

        this.websocket_.onopen = function() {
            trace('Signaling channel opened.');
            this.websocket_.onerror = function() {
                trace('Signaling channel error.');
            };
    
            this.websocket_.onclose = function(event) {
                trace('Channel closed with code: ' + event.code + ' reason: ' + event.reason);
                this.websocket_ = null;
                this.registered_ = false;
            };
    
            if (this.clientId_ && this.roomId_) {
                trace('Signaling register pre.');
                this.register(this.roomId_, this.clientId_);
            } else {
            };

            resolve();
        }.bind(this);

        this.websocket_.onmessage = function(event) {
            trace('WSS->C: ' + event.data);

            var message = parseJSON(event.data);
            if (!message) {
                trace('Failed to parse WSS message: ' + event.data);
                return;
            }
            if (message.error) {
                trace('Signaling server error message: ' + message.error);
                return;
            }
            this.onmessage(message.msg);
        }.bind(this);

        this.websocket_.onerror = function() {
            reject(Error('WebSocket error.'));
        };

    }.bind(this));
};

WstSignalingChannel.prototype.register = function(roomId, clientId) {
    if (this.registered_) {
        trace('ERROR: SignalingChannel has already registered.');
        return;
    }

    this.roomId_ = roomId;
    this.clientId_ = clientId;

    if (!this.roomId_) {
        trace('ERROR: missing roomId.');
    }

    if (!this.clientId_) {
        trace('ERROR: missing clientId.');
    }

    if (!this.websocket_ || this.websocket_.readyState !== WebSocket.OPEN) {
        trace('WebSocket not open yet; saving the IDs to register later.');
        return;
    }
    trace('Registering signaling channel.');

    var registerMessage = {
        cmd: 'register',
        roomid: this.roomId_,
        clientid: this.clientId_
    };
    this.websocket_.send(JSON.stringify(registerMessage));
    this.registered_ = true;

    trace('Signaling channel registered.');
};

WstSignalingChannel.prototype.close = function(async) {
    if (this.websocket_) {
        this.websocket_.close();
        this.websocket_ = null;
    }

    if (!this.clientId_ || !this.roomId_) {
        return;
    }

    // Tell WSS that we're done.
    var path = this.getWssPostUrl();

    return sendUrlRequest('DELETE', path, async).catch(function(error) {
        trace('Error deteting web socket connection: ' + error.message);
    }.bind(this)).then(function() {
        this.clientId_ = null;
        this.roomid_ = null;
        this.registered_ = false;
    }.bind(this));
};

WstSignalingChannel.prototype.send = function(message) {
    if (!this.roomId_ || !this.clientId_) {
        trace('ERROR: SignalingChannel has not registered.');
        return;
    }
    trace('C->WSS: ' + message);

    var wssMessage = {
        cmd: 'send',
        msg: message
    };
    var msgString = JSON.stringify(wssMessage);

    if (this.websocket_ && this.websocket_.readyState === WebSocket.OPEN) {
        this.websocket_.send(msgString);
    }
};

WstSignalingChannel.prototype.getWssPostUrl = function() {
    return this.wssPostUrl_ + '/' + this.roomId_ + '/' + this.clientId_;
};