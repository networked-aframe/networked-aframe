/* global define, module, require */
/*!
  Script: easyrtc_lang.js

    Provides lang file.

  About: License

    Copyright (c) 2016, Priologic Software Inc.
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright notice,
          this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
    CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
    INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
    POSSIBILITY OF SUCH DAMAGE.
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //RequireJS (AMD) build system
        define('easyrtc_lang',factory);
    } else if (typeof module === 'object' && module.exports) {
        //CommonJS build system
        module.exports = factory();
    } else {
        root.easyrtc_lang = factory();
  }
}(this, function (undefined) {

  "use strict";

return {
  "unableToEnterRoom":"Unable to enter room {0} because {1}" ,
  "resolutionWarning": "Requested video size of {0}x{1} but got size of {2}x{3}",
  "badUserName": "Illegal username {0}",
  "localMediaError": "Error getting local media stream: {0}",
  "miscSignalError": "Miscellaneous error from signalling server. It may be ignorable.",
  "noServer": "Unable to reach the EasyRTC signalling server.",
  "badsocket": "Socket.io connect event fired with bad websocket.",
  "icf": "Internal communications failure",
  "statsNotSupported":"call statistics not supported by this browser, try Chrome.",
   "noWebrtcSupport":"Your browser doesn't appear to support WebRTC.",
   "gumFailed":"Failed to get access to local media. Error code was {0}.",
   "requireAudioOrVideo":"At least one of audio and video must be provided"
};

}));
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define('webrtc-adapter',[],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.adapter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
 /* eslint-env node */


// SDP helpers.
var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
SDPUtils.generateIdentifier = function() {
  return Math.random().toString(36).substr(2, 10);
};

// The RTCP CNAME used by all peerconnections from the same JS.
SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
SDPUtils.splitLines = function(blob) {
  return blob.trim().split('\n').map(function(line) {
    return line.trim();
  });
};
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
SDPUtils.splitSections = function(blob) {
  var parts = blob.split('\nm=');
  return parts.map(function(part, index) {
    return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
  });
};

// Returns lines that start with a certain prefix.
SDPUtils.matchPrefix = function(blob, prefix) {
  return SDPUtils.splitLines(blob).filter(function(line) {
    return line.indexOf(prefix) === 0;
  });
};

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
SDPUtils.parseCandidate = function(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parts[1],
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7]
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      default: // Unknown extensions are silently ignored.
        break;
    }
  }
  return candidate;
};

// Translates a candidate object into SDP candidate attribute.
SDPUtils.writeCandidate = function(candidate) {
  var sdp = [];
  sdp.push(candidate.foundation);
  sdp.push(candidate.component);
  sdp.push(candidate.protocol.toUpperCase());
  sdp.push(candidate.priority);
  sdp.push(candidate.ip);
  sdp.push(candidate.port);

  var type = candidate.type;
  sdp.push('typ');
  sdp.push(type);
  if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
    sdp.push('raddr');
    sdp.push(candidate.relatedAddress); // was: relAddr
    sdp.push('rport');
    sdp.push(candidate.relatedPort); // was: relPort
  }
  if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
    sdp.push('tcptype');
    sdp.push(candidate.tcpType);
  }
  return 'candidate:' + sdp.join(' ');
};

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
SDPUtils.parseRtpMap = function(line) {
  var parts = line.substr(9).split(' ');
  var parsed = {
    payloadType: parseInt(parts.shift(), 10) // was: id
  };

  parts = parts[0].split('/');

  parsed.name = parts[0];
  parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  // was: channels
  parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
  return parsed;
};

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
SDPUtils.writeRtpMap = function(codec) {
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
};

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
SDPUtils.parseExtmap = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    id: parseInt(parts[0], 10),
    uri: parts[1]
  };
};

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
SDPUtils.writeExtmap = function(headerExtension) {
  return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
       ' ' + headerExtension.uri + '\r\n';
};

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
SDPUtils.parseFmtp = function(line) {
  var parsed = {};
  var kv;
  var parts = line.substr(line.indexOf(' ') + 1).split(';');
  for (var j = 0; j < parts.length; j++) {
    kv = parts[j].trim().split('=');
    parsed[kv[0].trim()] = kv[1];
  }
  return parsed;
};

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeFmtp = function(codec) {
  var line = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.parameters && Object.keys(codec.parameters).length) {
    var params = [];
    Object.keys(codec.parameters).forEach(function(param) {
      params.push(param + '=' + codec.parameters[param]);
    });
    line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
  }
  return line;
};

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
SDPUtils.parseRtcpFb = function(line) {
  var parts = line.substr(line.indexOf(' ') + 1).split(' ');
  return {
    type: parts.shift(),
    parameter: parts.join(' ')
  };
};
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeRtcpFb = function(codec) {
  var lines = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
    codec.rtcpFeedback.forEach(function(fb) {
      lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
      (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
          '\r\n';
    });
  }
  return lines;
};

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
SDPUtils.parseSsrcMedia = function(line) {
  var sp = line.indexOf(' ');
  var parts = {
    ssrc: parseInt(line.substr(7, sp - 7), 10)
  };
  var colon = line.indexOf(':', sp);
  if (colon > -1) {
    parts.attribute = line.substr(sp + 1, colon - sp - 1);
    parts.value = line.substr(colon + 1);
  } else {
    parts.attribute = line.substr(sp + 1);
  }
  return parts;
};

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var fpLine = lines.filter(function(line) {
    return line.indexOf('a=fingerprint:') === 0;
  })[0].substr(14);
  // Note: a=setup line is ignored since we use the 'auto' role.
  var dtlsParameters = {
    role: 'auto',
    fingerprints: [{
      algorithm: fpLine.split(' ')[0],
      value: fpLine.split(' ')[1]
    }]
  };
  return dtlsParameters;
};

// Serializes DTLS parameters to SDP.
SDPUtils.writeDtlsParameters = function(params, setupType) {
  var sdp = 'a=setup:' + setupType + '\r\n';
  params.fingerprints.forEach(function(fp) {
    sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
  });
  return sdp;
};
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var iceParameters = {
    usernameFragment: lines.filter(function(line) {
      return line.indexOf('a=ice-ufrag:') === 0;
    })[0].substr(12),
    password: lines.filter(function(line) {
      return line.indexOf('a=ice-pwd:') === 0;
    })[0].substr(10)
  };
  return iceParameters;
};

// Serializes ICE parameters to SDP.
SDPUtils.writeIceParameters = function(params) {
  return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
};

// Parses the SDP media section and returns RTCRtpParameters.
SDPUtils.parseRtpParameters = function(mediaSection) {
  var description = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: [],
    rtcp: []
  };
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
    var pt = mline[i];
    var rtpmapline = SDPUtils.matchPrefix(
        mediaSection, 'a=rtpmap:' + pt + ' ')[0];
    if (rtpmapline) {
      var codec = SDPUtils.parseRtpMap(rtpmapline);
      var fmtps = SDPUtils.matchPrefix(
          mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
      codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
      codec.rtcpFeedback = SDPUtils.matchPrefix(
          mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
      description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
      switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
      }
    }
  }
  SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
    description.headerExtensions.push(SDPUtils.parseExtmap(line));
  });
  // FIXME: parse rtcp.
  return description;
};

// Generates parts of the SDP media section describing the capabilities /
// parameters.
SDPUtils.writeRtpDescription = function(kind, caps) {
  var sdp = '';

  // Build the mline.
  sdp += 'm=' + kind + ' ';
  sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
  sdp += ' UDP/TLS/RTP/SAVPF ';
  sdp += caps.codecs.map(function(codec) {
    if (codec.preferredPayloadType !== undefined) {
      return codec.preferredPayloadType;
    }
    return codec.payloadType;
  }).join(' ') + '\r\n';

  sdp += 'c=IN IP4 0.0.0.0\r\n';
  sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
  caps.codecs.forEach(function(codec) {
    sdp += SDPUtils.writeRtpMap(codec);
    sdp += SDPUtils.writeFmtp(codec);
    sdp += SDPUtils.writeRtcpFb(codec);
  });
  // FIXME: add headerExtensions, fecMechanismş and rtcp.
  sdp += 'a=rtcp-mux\r\n';
  return sdp;
};

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
  var encodingParameters = [];
  var description = SDPUtils.parseRtpParameters(mediaSection);
  var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
  var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
  var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'cname';
  });
  var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
  var secondarySsrc;

  var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
  .map(function(line) {
    var parts = line.split(' ');
    parts.shift();
    return parts.map(function(part) {
      return parseInt(part, 10);
    });
  });
  if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
    secondarySsrc = flows[0][1];
  }

  description.codecs.forEach(function(codec) {
    if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
      var encParam = {
        ssrc: primarySsrc,
        codecPayloadType: parseInt(codec.parameters.apt, 10),
        rtx: {
          payloadType: codec.payloadType,
          ssrc: secondarySsrc
        }
      };
      encodingParameters.push(encParam);
      if (hasRed) {
        encParam = JSON.parse(JSON.stringify(encParam));
        encParam.fec = {
          ssrc: secondarySsrc,
          mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
        };
        encodingParameters.push(encParam);
      }
    }
  });
  if (encodingParameters.length === 0 && primarySsrc) {
    encodingParameters.push({
      ssrc: primarySsrc
    });
  }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
  var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
  if (bandwidth.length) {
    if (bandwidth[0].indexOf('b=TIAS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(7), 10);
    } else if (bandwidth[0].indexOf('b=AS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(5), 10);
    }
    encodingParameters.forEach(function(params) {
      params.maxBitrate = bandwidth;
    });
  }
  return encodingParameters;
};

SDPUtils.writeSessionBoilerplate = function() {
  // FIXME: sess-id should be an NTP timestamp.
  return 'v=0\r\n' +
      'o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
};

SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  // FIXME: for RTX there might be multiple SSRCs. Not implemented in Edge yet.
  if (transceiver.rtpSender) {
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  return sdp;
};

// Gets the direction from the mediaSection or the sessionpart.
SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
  var lines = SDPUtils.splitLines(mediaSection);
  for (var i = 0; i < lines.length; i++) {
    switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
    }
  }
  if (sessionpart) {
    return SDPUtils.getDirection(sessionpart);
  }
  return 'sendrecv';
};

// Expose public methods.
module.exports = SDPUtils;

},{}],2:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */



// Shimming starts here.
(function() {
  // Utils.
  var logging = require('./utils').log;
  var browserDetails = require('./utils').browserDetails;
  // Export to the adapter global object visible in the browser.
  module.exports.browserDetails = browserDetails;
  module.exports.extractVersion = require('./utils').extractVersion;
  module.exports.disableLog = require('./utils').disableLog;

  // Uncomment the line below if you want logging to occur, including logging
  // for the switch statement below. Can also be turned on in the browser via
  // adapter.disableLog(false), but then logging from the switch statement below
  // will not appear.
  // require('./utils').disableLog(false);

  // Browser shims.
  var chromeShim = require('./chrome/chrome_shim') || null;
  var edgeShim = require('./edge/edge_shim') || null;
  var firefoxShim = require('./firefox/firefox_shim') || null;
  var safariShim = require('./safari/safari_shim') || null;

  // Shim browser if found.
  switch (browserDetails.browser) {
    case 'opera': // fallthrough as it uses chrome shims
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection) {
        logging('Chrome shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = chromeShim;

      chromeShim.shimGetUserMedia();
      chromeShim.shimMediaStream();
      chromeShim.shimSourceObject();
      chromeShim.shimPeerConnection();
      chromeShim.shimOnTrack();
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection) {
        logging('Firefox shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = firefoxShim;

      firefoxShim.shimGetUserMedia();
      firefoxShim.shimSourceObject();
      firefoxShim.shimPeerConnection();
      firefoxShim.shimOnTrack();
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection) {
        logging('MS edge shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = edgeShim;

      edgeShim.shimGetUserMedia();
      edgeShim.shimPeerConnection();
      break;
    case 'safari':
      if (!safariShim) {
        logging('Safari shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = safariShim;

      safariShim.shimGetUserMedia();
      break;
    default:
      logging('Unsupported browser!');
  }
})();

},{"./chrome/chrome_shim":3,"./edge/edge_shim":5,"./firefox/firefox_shim":7,"./safari/safari_shim":9,"./utils":10}],3:[function(require,module,exports){

/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

var logging = require('../utils.js').log;
var browserDetails = require('../utils.js').browserDetails;

var chromeShim = {
  shimMediaStream: function() {
    window.MediaStream = window.MediaStream || window.webkitMediaStream;
  },

  shimOnTrack: function() {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          var self = this;
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function(e) {
            // onaddstream does not fire when a track is added to an existing
            // stream. But stream.onaddtrack is implemented so we use that.
            e.stream.addEventListener('addtrack', function(te) {
              var event = new Event('track');
              event.track = te.track;
              event.receiver = {track: te.track};
              event.streams = [e.stream];
              self.dispatchEvent(event);
            });
            e.stream.getTracks().forEach(function(track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = {track: track};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
  },

  shimSourceObject: function() {
    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this._srcObject;
          },
          set: function(stream) {
            var self = this;
            // Use _srcObject as a private property for this shim
            this._srcObject = stream;
            if (this.src) {
              URL.revokeObjectURL(this.src);
            }

            if (!stream) {
              this.src = '';
              return;
            }
            this.src = URL.createObjectURL(stream);
            // We need to recreate the blob url when a track is added or
            // removed. Doing it manually since we want to avoid a recursion.
            stream.addEventListener('addtrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
            stream.addEventListener('removetrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
          }
        });
      }
    }
  },

  shimPeerConnection: function() {
    // The RTCPeerConnection object.
    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
      // Translate iceTransportPolicy to iceTransports,
      // see https://code.google.com/p/webrtc/issues/detail?id=4869
      logging('PeerConnection');
      if (pcConfig && pcConfig.iceTransportPolicy) {
        pcConfig.iceTransports = pcConfig.iceTransportPolicy;
      }

      var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints);
      var origGetStats = pc.getStats.bind(pc);
      pc.getStats = function(selector, successCallback, errorCallback) {
        var self = this;
        var args = arguments;

        // If selector is a function then we are in the old style stats so just
        // pass back the original getStats format to avoid breaking old users.
        if (arguments.length > 0 && typeof selector === 'function') {
          return origGetStats(selector, successCallback);
        }

        var fixChromeStats_ = function(response) {
          var standardReport = {};
          var reports = response.result();
          reports.forEach(function(report) {
            var standardStats = {
              id: report.id,
              timestamp: report.timestamp,
              type: report.type
            };
            report.names().forEach(function(name) {
              standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
          });

          return standardReport;
        };

        // shim getStats with maplike support
        var makeMapStats = function(stats, legacyStats) {
          var map = new Map(Object.keys(stats).map(function(key) {
            return[key, stats[key]];
          }));
          legacyStats = legacyStats || stats;
          Object.keys(legacyStats).forEach(function(key) {
            map[key] = legacyStats[key];
          });
          return map;
        };

        if (arguments.length >= 2) {
          var successCallbackWrapper_ = function(response) {
            args[1](makeMapStats(fixChromeStats_(response)));
          };

          return origGetStats.apply(this, [successCallbackWrapper_,
              arguments[0]]);
        }

        // promise-support
        return new Promise(function(resolve, reject) {
          if (args.length === 1 && typeof selector === 'object') {
            origGetStats.apply(self, [
              function(response) {
                resolve(makeMapStats(fixChromeStats_(response)));
              }, reject]);
          } else {
            // Preserve legacy chrome stats only on legacy access of stats obj
            origGetStats.apply(self, [
              function(response) {
                resolve(makeMapStats(fixChromeStats_(response),
                    response.result()));
              }, reject]);
          }
        }).then(successCallback, errorCallback);
      };

      return pc;
    };
    window.RTCPeerConnection.prototype = webkitRTCPeerConnection.prototype;

    // wrap static methods. Currently just generateCertificate.
    if (webkitRTCPeerConnection.generateCertificate) {
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function() {
          return webkitRTCPeerConnection.generateCertificate;
        }
      });
    }

    ['createOffer', 'createAnswer'].forEach(function(method) {
      var nativeMethod = webkitRTCPeerConnection.prototype[method];
      webkitRTCPeerConnection.prototype[method] = function() {
        var self = this;
        if (arguments.length < 1 || (arguments.length === 1 &&
            typeof arguments[0] === 'object')) {
          var opts = arguments.length === 1 ? arguments[0] : undefined;
          return new Promise(function(resolve, reject) {
            nativeMethod.apply(self, [resolve, reject, opts]);
          });
        }
        return nativeMethod.apply(this, arguments);
      };
    });

    // add promise support -- natively available in Chrome 51
    if (browserDetails.version < 51) {
      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
          .forEach(function(method) {
            var nativeMethod = webkitRTCPeerConnection.prototype[method];
            webkitRTCPeerConnection.prototype[method] = function() {
              var args = arguments;
              var self = this;
              var promise = new Promise(function(resolve, reject) {
                nativeMethod.apply(self, [args[0], resolve, reject]);
              });
              if (args.length < 2) {
                return promise;
              }
              return promise.then(function() {
                args[1].apply(null, []);
              },
              function(err) {
                if (args.length >= 3) {
                  args[2].apply(null, [err]);
                }
              });
            };
          });
    }

    // shim implicit creation of RTCSessionDescription/RTCIceCandidate
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = webkitRTCPeerConnection.prototype[method];
          webkitRTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                RTCIceCandidate : RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        RTCPeerConnection.prototype.addIceCandidate;
    RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };
  }
};


// Expose public methods.
module.exports = {
  shimMediaStream: chromeShim.shimMediaStream,
  shimOnTrack: chromeShim.shimOnTrack,
  shimSourceObject: chromeShim.shimSourceObject,
  shimPeerConnection: chromeShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia')
};

},{"../utils.js":10,"./getusermedia":4}],4:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

var logging = require('../utils.js').log;

// Expose public methods.
module.exports = function() {
  var constraintsToChrome_ = function(c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function(key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname_ = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return (name === 'deviceId') ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname_('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function(mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function(constraints, func) {
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && constraints.audio) {
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && typeof constraints.video === 'object') {
      // Shim facingMode for mobile, where it defaults to "user".
      var face = constraints.video.facingMode;
      face = face && ((typeof face === 'object') ? face : {ideal: face});

      if ((face && (face.exact === 'user' || face.exact === 'environment' ||
                    face.ideal === 'user' || face.ideal === 'environment')) &&
          !(navigator.mediaDevices.getSupportedConstraints &&
            navigator.mediaDevices.getSupportedConstraints().facingMode)) {
        delete constraints.video.facingMode;
        if (face.exact === 'environment' || face.ideal === 'environment') {
          // Look for "back" in label, or use last cam (typically back cam).
          return navigator.mediaDevices.enumerateDevices()
          .then(function(devices) {
            devices = devices.filter(function(d) {
              return d.kind === 'videoinput';
            });
            var back = devices.find(function(d) {
              return d.label.toLowerCase().indexOf('back') !== -1;
            }) || (devices.length && devices[devices.length - 1]);
            if (back) {
              constraints.video.deviceId = face.exact ? {exact: back.deviceId} :
                                                        {ideal: back.deviceId};
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
  };

  var shimError_ = function(e) {
    return {
      name: {
        PermissionDeniedError: 'NotAllowedError',
        ConstraintNotSatisfiedError: 'OverconstrainedError'
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraintName,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  var getUserMedia_ = function(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function(c) {
      navigator.webkitGetUserMedia(c, onSuccess, function(e) {
        onError(shimError_(e));
      });
    });
  };

  navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  };

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {
      getUserMedia: getUserMediaPromise_,
      enumerateDevices: function() {
        return new Promise(function(resolve) {
          var kinds = {audio: 'audioinput', video: 'videoinput'};
          return MediaStreamTrack.getSources(function(devices) {
            resolve(devices.map(function(device) {
              return {label: device.label,
                      kind: kinds[device.kind],
                      deviceId: device.id,
                      groupId: ''};
            }));
          });
        });
      }
    };
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return getUserMediaPromise_(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(cs) {
      return shimConstraints_(cs, function(c) {
        return origGetUserMedia(c).then(function(stream) {
          if (c.audio && !stream.getAudioTracks().length ||
              c.video && !stream.getVideoTracks().length) {
            stream.getTracks().forEach(function(track) {
              track.stop();
            });
            throw new DOMException('', 'NotFoundError');
          }
          return stream;
        }, function(e) {
          return Promise.reject(shimError_(e));
        });
      });
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function() {
      logging('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function() {
      logging('Dummy mediaDevices.removeEventListener called.');
    };
  }
};

},{"../utils.js":10}],5:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var SDPUtils = require('sdp');
var browserDetails = require('../utils').browserDetails;

var edgeShim = {
  shimPeerConnection: function() {
    if (window.RTCIceGatherer) {
      // ORTC defines an RTCIceCandidate object but no constructor.
      // Not implemented in Edge.
      if (!window.RTCIceCandidate) {
        window.RTCIceCandidate = function(args) {
          return args;
        };
      }
      // ORTC does not have a session description object but
      // other browsers (i.e. Chrome) that will support both PC and ORTC
      // in the future might have this defined already.
      if (!window.RTCSessionDescription) {
        window.RTCSessionDescription = function(args) {
          return args;
        };
      }
      // this adds an additional event listener to MediaStrackTrack that signals
      // when a tracks enabled property was changed.
      var origMSTEnabled = Object.getOwnPropertyDescriptor(
          MediaStreamTrack.prototype, 'enabled');
      Object.defineProperty(MediaStreamTrack.prototype, 'enabled', {
        set: function(value) {
          origMSTEnabled.set.call(this, value);
          var ev = new Event('enabled');
          ev.enabled = value;
          this.dispatchEvent(ev);
        }
      });
    }

    window.RTCPeerConnection = function(config) {
      var self = this;

      var _eventTarget = document.createDocumentFragment();
      ['addEventListener', 'removeEventListener', 'dispatchEvent']
          .forEach(function(method) {
            self[method] = _eventTarget[method].bind(_eventTarget);
          });

      this.onicecandidate = null;
      this.onaddstream = null;
      this.ontrack = null;
      this.onremovestream = null;
      this.onsignalingstatechange = null;
      this.oniceconnectionstatechange = null;
      this.onnegotiationneeded = null;
      this.ondatachannel = null;

      this.localStreams = [];
      this.remoteStreams = [];
      this.getLocalStreams = function() {
        return self.localStreams;
      };
      this.getRemoteStreams = function() {
        return self.remoteStreams;
      };

      this.localDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.remoteDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.signalingState = 'stable';
      this.iceConnectionState = 'new';
      this.iceGatheringState = 'new';

      this.iceOptions = {
        gatherPolicy: 'all',
        iceServers: []
      };
      if (config && config.iceTransportPolicy) {
        switch (config.iceTransportPolicy) {
          case 'all':
          case 'relay':
            this.iceOptions.gatherPolicy = config.iceTransportPolicy;
            break;
          case 'none':
            // FIXME: remove once implementation and spec have added this.
            throw new TypeError('iceTransportPolicy "none" not supported');
          default:
            // don't set iceTransportPolicy.
            break;
        }
      }
      this.usingBundle = config && config.bundlePolicy === 'max-bundle';

      if (config && config.iceServers) {
        // Edge does not like
        // 1) stun:
        // 2) turn: that does not have all of turn:host:port?transport=udp
        // 3) turn: with ipv6 addresses
        var iceServers = JSON.parse(JSON.stringify(config.iceServers));
        this.iceOptions.iceServers = iceServers.filter(function(server) {
          if (server && server.urls) {
            var urls = server.urls;
            if (typeof urls === 'string') {
              urls = [urls];
            }
            urls = urls.filter(function(url) {
              return (url.indexOf('turn:') === 0 &&
                  url.indexOf('transport=udp') !== -1 &&
                  url.indexOf('turn:[') === -1) ||
                  (url.indexOf('stun:') === 0 &&
                    browserDetails.version >= 14393);
            })[0];
            return !!urls;
          }
          return false;
        });
      }
      this._config = config;

      // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
      // everything that is needed to describe a SDP m-line.
      this.transceivers = [];

      // since the iceGatherer is currently created in createOffer but we
      // must not emit candidates until after setLocalDescription we buffer
      // them in this array.
      this._localIceCandidatesBuffer = [];
    };

    window.RTCPeerConnection.prototype._emitBufferedCandidates = function() {
      var self = this;
      var sections = SDPUtils.splitSections(self.localDescription.sdp);
      // FIXME: need to apply ice candidates in a way which is async but
      // in-order
      this._localIceCandidatesBuffer.forEach(function(event) {
        var end = !event.candidate || Object.keys(event.candidate).length === 0;
        if (end) {
          for (var j = 1; j < sections.length; j++) {
            if (sections[j].indexOf('\r\na=end-of-candidates\r\n') === -1) {
              sections[j] += 'a=end-of-candidates\r\n';
            }
          }
        } else if (event.candidate.candidate.indexOf('typ endOfCandidates')
            === -1) {
          sections[event.candidate.sdpMLineIndex + 1] +=
              'a=' + event.candidate.candidate + '\r\n';
        }
        self.localDescription.sdp = sections.join('');
        self.dispatchEvent(event);
        if (self.onicecandidate !== null) {
          self.onicecandidate(event);
        }
        if (!event.candidate && self.iceGatheringState !== 'complete') {
          var complete = self.transceivers.every(function(transceiver) {
            return transceiver.iceGatherer &&
                transceiver.iceGatherer.state === 'completed';
          });
          if (complete) {
            self.iceGatheringState = 'complete';
          }
        }
      });
      this._localIceCandidatesBuffer = [];
    };

    window.RTCPeerConnection.prototype.getConfiguration = function() {
      return this._config;
    };

    window.RTCPeerConnection.prototype.addStream = function(stream) {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
      var clonedStream = stream.clone();
      stream.getTracks().forEach(function(track, idx) {
        var clonedTrack = clonedStream.getTracks()[idx];
        track.addEventListener('enabled', function(event) {
          clonedTrack.enabled = event.enabled;
        });
      });
      this.localStreams.push(clonedStream);
      this._maybeFireNegotiationNeeded();
    };

    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      var idx = this.localStreams.indexOf(stream);
      if (idx > -1) {
        this.localStreams.splice(idx, 1);
        this._maybeFireNegotiationNeeded();
      }
    };

    window.RTCPeerConnection.prototype.getSenders = function() {
      return this.transceivers.filter(function(transceiver) {
        return !!transceiver.rtpSender;
      })
      .map(function(transceiver) {
        return transceiver.rtpSender;
      });
    };

    window.RTCPeerConnection.prototype.getReceivers = function() {
      return this.transceivers.filter(function(transceiver) {
        return !!transceiver.rtpReceiver;
      })
      .map(function(transceiver) {
        return transceiver.rtpReceiver;
      });
    };

    // Determines the intersection of local and remote capabilities.
    window.RTCPeerConnection.prototype._getCommonCapabilities =
        function(localCapabilities, remoteCapabilities) {
          var commonCapabilities = {
            codecs: [],
            headerExtensions: [],
            fecMechanisms: []
          };
          localCapabilities.codecs.forEach(function(lCodec) {
            for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
              var rCodec = remoteCapabilities.codecs[i];
              if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
                  lCodec.clockRate === rCodec.clockRate) {
                // number of channels is the highest common number of channels
                rCodec.numChannels = Math.min(lCodec.numChannels,
                    rCodec.numChannels);
                // push rCodec so we reply with offerer payload type
                commonCapabilities.codecs.push(rCodec);

                // determine common feedback mechanisms
                rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
                  for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
                    if (lCodec.rtcpFeedback[j].type === fb.type &&
                        lCodec.rtcpFeedback[j].parameter === fb.parameter) {
                      return true;
                    }
                  }
                  return false;
                });
                // FIXME: also need to determine .parameters
                //  see https://github.com/openpeer/ortc/issues/569
                break;
              }
            }
          });

          localCapabilities.headerExtensions
              .forEach(function(lHeaderExtension) {
                for (var i = 0; i < remoteCapabilities.headerExtensions.length;
                     i++) {
                  var rHeaderExtension = remoteCapabilities.headerExtensions[i];
                  if (lHeaderExtension.uri === rHeaderExtension.uri) {
                    commonCapabilities.headerExtensions.push(rHeaderExtension);
                    break;
                  }
                }
              });

          // FIXME: fecMechanisms
          return commonCapabilities;
        };

    // Create ICE gatherer, ICE transport and DTLS transport.
    window.RTCPeerConnection.prototype._createIceAndDtlsTransports =
        function(mid, sdpMLineIndex) {
          var self = this;
          var iceGatherer = new RTCIceGatherer(self.iceOptions);
          var iceTransport = new RTCIceTransport(iceGatherer);
          iceGatherer.onlocalcandidate = function(evt) {
            var event = new Event('icecandidate');
            event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

            var cand = evt.candidate;
            var end = !cand || Object.keys(cand).length === 0;
            // Edge emits an empty object for RTCIceCandidateComplete‥
            if (end) {
              // polyfill since RTCIceGatherer.state is not implemented in
              // Edge 10547 yet.
              if (iceGatherer.state === undefined) {
                iceGatherer.state = 'completed';
              }

              // Emit a candidate with type endOfCandidates to make the samples
              // work. Edge requires addIceCandidate with this empty candidate
              // to start checking. The real solution is to signal
              // end-of-candidates to the other side when getting the null
              // candidate but some apps (like the samples) don't do that.
              event.candidate.candidate =
                  'candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates';
            } else {
              // RTCIceCandidate doesn't have a component, needs to be added
              cand.component = iceTransport.component === 'RTCP' ? 2 : 1;
              event.candidate.candidate = SDPUtils.writeCandidate(cand);
            }

            // update local description.
            var sections = SDPUtils.splitSections(self.localDescription.sdp);
            if (event.candidate.candidate.indexOf('typ endOfCandidates')
                === -1) {
              sections[event.candidate.sdpMLineIndex + 1] +=
                  'a=' + event.candidate.candidate + '\r\n';
            } else {
              sections[event.candidate.sdpMLineIndex + 1] +=
                  'a=end-of-candidates\r\n';
            }
            self.localDescription.sdp = sections.join('');

            var complete = self.transceivers.every(function(transceiver) {
              return transceiver.iceGatherer &&
                  transceiver.iceGatherer.state === 'completed';
            });

            // Emit candidate if localDescription is set.
            // Also emits null candidate when all gatherers are complete.
            switch (self.iceGatheringState) {
              case 'new':
                self._localIceCandidatesBuffer.push(event);
                if (end && complete) {
                  self._localIceCandidatesBuffer.push(
                      new Event('icecandidate'));
                }
                break;
              case 'gathering':
                self._emitBufferedCandidates();
                self.dispatchEvent(event);
                if (self.onicecandidate !== null) {
                  self.onicecandidate(event);
                }
                if (complete) {
                  self.dispatchEvent(new Event('icecandidate'));
                  if (self.onicecandidate !== null) {
                    self.onicecandidate(new Event('icecandidate'));
                  }
                  self.iceGatheringState = 'complete';
                }
                break;
              case 'complete':
                // should not happen... currently!
                break;
              default: // no-op.
                break;
            }
          };
          iceTransport.onicestatechange = function() {
            self._updateConnectionState();
          };

          var dtlsTransport = new RTCDtlsTransport(iceTransport);
          dtlsTransport.ondtlsstatechange = function() {
            self._updateConnectionState();
          };
          dtlsTransport.onerror = function() {
            // onerror does not set state to failed by itself.
            dtlsTransport.state = 'failed';
            self._updateConnectionState();
          };

          return {
            iceGatherer: iceGatherer,
            iceTransport: iceTransport,
            dtlsTransport: dtlsTransport
          };
        };

    // Start the RTP Sender and Receiver for a transceiver.
    window.RTCPeerConnection.prototype._transceive = function(transceiver,
        send, recv) {
      var params = this._getCommonCapabilities(transceiver.localCapabilities,
          transceiver.remoteCapabilities);
      if (send && transceiver.rtpSender) {
        params.encodings = transceiver.sendEncodingParameters;
        params.rtcp = {
          cname: SDPUtils.localCName
        };
        if (transceiver.recvEncodingParameters.length) {
          params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
        }
        transceiver.rtpSender.send(params);
      }
      if (recv && transceiver.rtpReceiver) {
        // remove RTX field in Edge 14942
        if (transceiver.kind === 'video'
            && transceiver.recvEncodingParameters) {
          transceiver.recvEncodingParameters.forEach(function(p) {
            delete p.rtx;
          });
        }
        params.encodings = transceiver.recvEncodingParameters;
        params.rtcp = {
          cname: transceiver.cname
        };
        if (transceiver.sendEncodingParameters.length) {
          params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
        }
        transceiver.rtpReceiver.receive(params);
      }
    };

    window.RTCPeerConnection.prototype.setLocalDescription =
        function(description) {
          var self = this;
          var sections;
          var sessionpart;
          if (description.type === 'offer') {
            // FIXME: What was the purpose of this empty if statement?
            // if (!this._pendingOffer) {
            // } else {
            if (this._pendingOffer) {
              // VERY limited support for SDP munging. Limited to:
              // * changing the order of codecs
              sections = SDPUtils.splitSections(description.sdp);
              sessionpart = sections.shift();
              sections.forEach(function(mediaSection, sdpMLineIndex) {
                var caps = SDPUtils.parseRtpParameters(mediaSection);
                self._pendingOffer[sdpMLineIndex].localCapabilities = caps;
              });
              this.transceivers = this._pendingOffer;
              delete this._pendingOffer;
            }
          } else if (description.type === 'answer') {
            sections = SDPUtils.splitSections(self.remoteDescription.sdp);
            sessionpart = sections.shift();
            var isIceLite = SDPUtils.matchPrefix(sessionpart,
                'a=ice-lite').length > 0;
            sections.forEach(function(mediaSection, sdpMLineIndex) {
              var transceiver = self.transceivers[sdpMLineIndex];
              var iceGatherer = transceiver.iceGatherer;
              var iceTransport = transceiver.iceTransport;
              var dtlsTransport = transceiver.dtlsTransport;
              var localCapabilities = transceiver.localCapabilities;
              var remoteCapabilities = transceiver.remoteCapabilities;

              var rejected = mediaSection.split('\n', 1)[0]
                  .split(' ', 2)[1] === '0';

              if (!rejected && !transceiver.isDatachannel) {
                var remoteIceParameters = SDPUtils.getIceParameters(
                    mediaSection, sessionpart);
                if (isIceLite) {
                  var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
                  .map(function(cand) {
                    return SDPUtils.parseCandidate(cand);
                  })
                  .filter(function(cand) {
                    return cand.component === '1';
                  });
                  // ice-lite only includes host candidates in the SDP so we can
                  // use setRemoteCandidates (which implies an
                  // RTCIceCandidateComplete)
                  if (cands.length) {
                    iceTransport.setRemoteCandidates(cands);
                  }
                }
                var remoteDtlsParameters = SDPUtils.getDtlsParameters(
                    mediaSection, sessionpart);
                if (isIceLite) {
                  remoteDtlsParameters.role = 'server';
                }

                if (!self.usingBundle || sdpMLineIndex === 0) {
                  iceTransport.start(iceGatherer, remoteIceParameters,
                      isIceLite ? 'controlling' : 'controlled');
                  dtlsTransport.start(remoteDtlsParameters);
                }

                // Calculate intersection of capabilities.
                var params = self._getCommonCapabilities(localCapabilities,
                    remoteCapabilities);

                // Start the RTCRtpSender. The RTCRtpReceiver for this
                // transceiver has already been started in setRemoteDescription.
                self._transceive(transceiver,
                    params.codecs.length > 0,
                    false);
              }
            });
          }

          this.localDescription = {
            type: description.type,
            sdp: description.sdp
          };
          switch (description.type) {
            case 'offer':
              this._updateSignalingState('have-local-offer');
              break;
            case 'answer':
              this._updateSignalingState('stable');
              break;
            default:
              throw new TypeError('unsupported type "' + description.type +
                  '"');
          }

          // If a success callback was provided, emit ICE candidates after it
          // has been executed. Otherwise, emit callback after the Promise is
          // resolved.
          var hasCallback = arguments.length > 1 &&
            typeof arguments[1] === 'function';
          if (hasCallback) {
            var cb = arguments[1];
            window.setTimeout(function() {
              cb();
              if (self.iceGatheringState === 'new') {
                self.iceGatheringState = 'gathering';
              }
              self._emitBufferedCandidates();
            }, 0);
          }
          var p = Promise.resolve();
          p.then(function() {
            if (!hasCallback) {
              if (self.iceGatheringState === 'new') {
                self.iceGatheringState = 'gathering';
              }
              // Usually candidates will be emitted earlier.
              window.setTimeout(self._emitBufferedCandidates.bind(self), 500);
            }
          });
          return p;
        };

    window.RTCPeerConnection.prototype.setRemoteDescription =
        function(description) {
          var self = this;
          var stream = new MediaStream();
          var receiverList = [];
          var sections = SDPUtils.splitSections(description.sdp);
          var sessionpart = sections.shift();
          var isIceLite = SDPUtils.matchPrefix(sessionpart,
              'a=ice-lite').length > 0;
          this.usingBundle = SDPUtils.matchPrefix(sessionpart,
              'a=group:BUNDLE ').length > 0;
          sections.forEach(function(mediaSection, sdpMLineIndex) {
            var lines = SDPUtils.splitLines(mediaSection);
            var mline = lines[0].substr(2).split(' ');
            var kind = mline[0];
            var rejected = mline[1] === '0';
            var direction = SDPUtils.getDirection(mediaSection, sessionpart);

            var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:');
            if (mid.length) {
              mid = mid[0].substr(6);
            } else {
              mid = SDPUtils.generateIdentifier();
            }

            // Reject datachannels which are not implemented yet.
            if (kind === 'application' && mline[2] === 'DTLS/SCTP') {
              self.transceivers[sdpMLineIndex] = {
                mid: mid,
                isDatachannel: true
              };
              return;
            }

            var transceiver;
            var iceGatherer;
            var iceTransport;
            var dtlsTransport;
            var rtpSender;
            var rtpReceiver;
            var sendEncodingParameters;
            var recvEncodingParameters;
            var localCapabilities;

            var track;
            // FIXME: ensure the mediaSection has rtcp-mux set.
            var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
            var remoteIceParameters;
            var remoteDtlsParameters;
            if (!rejected) {
              remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
                  sessionpart);
              remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
                  sessionpart);
              remoteDtlsParameters.role = 'client';
            }
            recvEncodingParameters =
                SDPUtils.parseRtpEncodingParameters(mediaSection);

            var cname;
            // Gets the first SSRC. Note that with RTX there might be multiple
            // SSRCs.
            var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
                .map(function(line) {
                  return SDPUtils.parseSsrcMedia(line);
                })
                .filter(function(obj) {
                  return obj.attribute === 'cname';
                })[0];
            if (remoteSsrc) {
              cname = remoteSsrc.value;
            }

            var isComplete = SDPUtils.matchPrefix(mediaSection,
                'a=end-of-candidates', sessionpart).length > 0;
            var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
                .map(function(cand) {
                  return SDPUtils.parseCandidate(cand);
                })
                .filter(function(cand) {
                  return cand.component === '1';
                });
            if (description.type === 'offer' && !rejected) {
              var transports = self.usingBundle && sdpMLineIndex > 0 ? {
                iceGatherer: self.transceivers[0].iceGatherer,
                iceTransport: self.transceivers[0].iceTransport,
                dtlsTransport: self.transceivers[0].dtlsTransport
              } : self._createIceAndDtlsTransports(mid, sdpMLineIndex);

              if (isComplete) {
                transports.iceTransport.setRemoteCandidates(cands);
              }

              localCapabilities = RTCRtpReceiver.getCapabilities(kind);

              // filter RTX until additional stuff needed for RTX is implemented
              // in adapter.js
              localCapabilities.codecs = localCapabilities.codecs.filter(
                  function(codec) {
                    return codec.name !== 'rtx';
                  });

              sendEncodingParameters = [{
                ssrc: (2 * sdpMLineIndex + 2) * 1001
              }];

              rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);

              track = rtpReceiver.track;
              receiverList.push([track, rtpReceiver]);
              // FIXME: not correct when there are multiple streams but that is
              // not currently supported in this shim.
              stream.addTrack(track);

              // FIXME: look at direction.
              if (self.localStreams.length > 0 &&
                  self.localStreams[0].getTracks().length >= sdpMLineIndex) {
                var localTrack;
                if (kind === 'audio') {
                  localTrack = self.localStreams[0].getAudioTracks()[0];
                } else if (kind === 'video') {
                  localTrack = self.localStreams[0].getVideoTracks()[0];
                }
                if (localTrack) {
                  rtpSender = new RTCRtpSender(localTrack,
                      transports.dtlsTransport);
                }
              }

              self.transceivers[sdpMLineIndex] = {
                iceGatherer: transports.iceGatherer,
                iceTransport: transports.iceTransport,
                dtlsTransport: transports.dtlsTransport,
                localCapabilities: localCapabilities,
                remoteCapabilities: remoteCapabilities,
                rtpSender: rtpSender,
                rtpReceiver: rtpReceiver,
                kind: kind,
                mid: mid,
                cname: cname,
                sendEncodingParameters: sendEncodingParameters,
                recvEncodingParameters: recvEncodingParameters
              };
              // Start the RTCRtpReceiver now. The RTPSender is started in
              // setLocalDescription.
              self._transceive(self.transceivers[sdpMLineIndex],
                  false,
                  direction === 'sendrecv' || direction === 'sendonly');
            } else if (description.type === 'answer' && !rejected) {
              transceiver = self.transceivers[sdpMLineIndex];
              iceGatherer = transceiver.iceGatherer;
              iceTransport = transceiver.iceTransport;
              dtlsTransport = transceiver.dtlsTransport;
              rtpSender = transceiver.rtpSender;
              rtpReceiver = transceiver.rtpReceiver;
              sendEncodingParameters = transceiver.sendEncodingParameters;
              localCapabilities = transceiver.localCapabilities;

              self.transceivers[sdpMLineIndex].recvEncodingParameters =
                  recvEncodingParameters;
              self.transceivers[sdpMLineIndex].remoteCapabilities =
                  remoteCapabilities;
              self.transceivers[sdpMLineIndex].cname = cname;

              if ((isIceLite || isComplete) && cands.length) {
                iceTransport.setRemoteCandidates(cands);
              }
              if (!self.usingBundle || sdpMLineIndex === 0) {
                iceTransport.start(iceGatherer, remoteIceParameters,
                    'controlling');
                dtlsTransport.start(remoteDtlsParameters);
              }

              self._transceive(transceiver,
                  direction === 'sendrecv' || direction === 'recvonly',
                  direction === 'sendrecv' || direction === 'sendonly');

              if (rtpReceiver &&
                  (direction === 'sendrecv' || direction === 'sendonly')) {
                track = rtpReceiver.track;
                receiverList.push([track, rtpReceiver]);
                stream.addTrack(track);
              } else {
                // FIXME: actually the receiver should be created later.
                delete transceiver.rtpReceiver;
              }
            }
          });

          this.remoteDescription = {
            type: description.type,
            sdp: description.sdp
          };
          switch (description.type) {
            case 'offer':
              this._updateSignalingState('have-remote-offer');
              break;
            case 'answer':
              this._updateSignalingState('stable');
              break;
            default:
              throw new TypeError('unsupported type "' + description.type +
                  '"');
          }
          if (stream.getTracks().length) {
            self.remoteStreams.push(stream);
            window.setTimeout(function() {
              var event = new Event('addstream');
              event.stream = stream;
              self.dispatchEvent(event);
              if (self.onaddstream !== null) {
                window.setTimeout(function() {
                  self.onaddstream(event);
                }, 0);
              }

              receiverList.forEach(function(item) {
                var track = item[0];
                var receiver = item[1];
                var trackEvent = new Event('track');
                trackEvent.track = track;
                trackEvent.receiver = receiver;
                trackEvent.streams = [stream];
                self.dispatchEvent(event);
                if (self.ontrack !== null) {
                  window.setTimeout(function() {
                    self.ontrack(trackEvent);
                  }, 0);
                }
              });
            }, 0);
          }
          if (arguments.length > 1 && typeof arguments[1] === 'function') {
            window.setTimeout(arguments[1], 0);
          }
          return Promise.resolve();
        };

    window.RTCPeerConnection.prototype.close = function() {
      this.transceivers.forEach(function(transceiver) {
        /* not yet
        if (transceiver.iceGatherer) {
          transceiver.iceGatherer.close();
        }
        */
        if (transceiver.iceTransport) {
          transceiver.iceTransport.stop();
        }
        if (transceiver.dtlsTransport) {
          transceiver.dtlsTransport.stop();
        }
        if (transceiver.rtpSender) {
          transceiver.rtpSender.stop();
        }
        if (transceiver.rtpReceiver) {
          transceiver.rtpReceiver.stop();
        }
      });
      // FIXME: clean up tracks, local streams, remote streams, etc
      this._updateSignalingState('closed');
    };

    // Update the signaling state.
    window.RTCPeerConnection.prototype._updateSignalingState =
        function(newState) {
          this.signalingState = newState;
          var event = new Event('signalingstatechange');
          this.dispatchEvent(event);
          if (this.onsignalingstatechange !== null) {
            this.onsignalingstatechange(event);
          }
        };

    // Determine whether to fire the negotiationneeded event.
    window.RTCPeerConnection.prototype._maybeFireNegotiationNeeded =
        function() {
          // Fire away (for now).
          var event = new Event('negotiationneeded');
          this.dispatchEvent(event);
          if (this.onnegotiationneeded !== null) {
            this.onnegotiationneeded(event);
          }
        };

    // Update the connection state.
    window.RTCPeerConnection.prototype._updateConnectionState = function() {
      var self = this;
      var newState;
      var states = {
        'new': 0,
        closed: 0,
        connecting: 0,
        checking: 0,
        connected: 0,
        completed: 0,
        failed: 0
      };
      this.transceivers.forEach(function(transceiver) {
        states[transceiver.iceTransport.state]++;
        states[transceiver.dtlsTransport.state]++;
      });
      // ICETransport.completed and connected are the same for this purpose.
      states.connected += states.completed;

      newState = 'new';
      if (states.failed > 0) {
        newState = 'failed';
      } else if (states.connecting > 0 || states.checking > 0) {
        newState = 'connecting';
      } else if (states.disconnected > 0) {
        newState = 'disconnected';
      } else if (states.new > 0) {
        newState = 'new';
      } else if (states.connected > 0 || states.completed > 0) {
        newState = 'connected';
      }

      if (newState !== self.iceConnectionState) {
        self.iceConnectionState = newState;
        var event = new Event('iceconnectionstatechange');
        this.dispatchEvent(event);
        if (this.oniceconnectionstatechange !== null) {
          this.oniceconnectionstatechange(event);
        }
      }
    };

    window.RTCPeerConnection.prototype.createOffer = function() {
      var self = this;
      if (this._pendingOffer) {
        throw new Error('createOffer called while there is a pending offer.');
      }
      var offerOptions;
      if (arguments.length === 1 && typeof arguments[0] !== 'function') {
        offerOptions = arguments[0];
      } else if (arguments.length === 3) {
        offerOptions = arguments[2];
      }

      var tracks = [];
      var numAudioTracks = 0;
      var numVideoTracks = 0;
      // Default to sendrecv.
      if (this.localStreams.length) {
        numAudioTracks = this.localStreams[0].getAudioTracks().length;
        numVideoTracks = this.localStreams[0].getVideoTracks().length;
      }
      // Determine number of audio and video tracks we need to send/recv.
      if (offerOptions) {
        // Reject Chrome legacy constraints.
        if (offerOptions.mandatory || offerOptions.optional) {
          throw new TypeError(
              'Legacy mandatory/optional constraints not supported.');
        }
        if (offerOptions.offerToReceiveAudio !== undefined) {
          numAudioTracks = offerOptions.offerToReceiveAudio;
        }
        if (offerOptions.offerToReceiveVideo !== undefined) {
          numVideoTracks = offerOptions.offerToReceiveVideo;
        }
      }
      if (this.localStreams.length) {
        // Push local streams.
        this.localStreams[0].getTracks().forEach(function(track) {
          tracks.push({
            kind: track.kind,
            track: track,
            wantReceive: track.kind === 'audio' ?
                numAudioTracks > 0 : numVideoTracks > 0
          });
          if (track.kind === 'audio') {
            numAudioTracks--;
          } else if (track.kind === 'video') {
            numVideoTracks--;
          }
        });
      }
      // Create M-lines for recvonly streams.
      while (numAudioTracks > 0 || numVideoTracks > 0) {
        if (numAudioTracks > 0) {
          tracks.push({
            kind: 'audio',
            wantReceive: true
          });
          numAudioTracks--;
        }
        if (numVideoTracks > 0) {
          tracks.push({
            kind: 'video',
            wantReceive: true
          });
          numVideoTracks--;
        }
      }

      var sdp = SDPUtils.writeSessionBoilerplate();
      var transceivers = [];
      tracks.forEach(function(mline, sdpMLineIndex) {
        // For each track, create an ice gatherer, ice transport,
        // dtls transport, potentially rtpsender and rtpreceiver.
        var track = mline.track;
        var kind = mline.kind;
        var mid = SDPUtils.generateIdentifier();

        var transports = self.usingBundle && sdpMLineIndex > 0 ? {
          iceGatherer: transceivers[0].iceGatherer,
          iceTransport: transceivers[0].iceTransport,
          dtlsTransport: transceivers[0].dtlsTransport
        } : self._createIceAndDtlsTransports(mid, sdpMLineIndex);

        var localCapabilities = RTCRtpSender.getCapabilities(kind);
        // filter RTX until additional stuff needed for RTX is implemented
        // in adapter.js
        localCapabilities.codecs = localCapabilities.codecs.filter(
            function(codec) {
              return codec.name !== 'rtx';
            });
        localCapabilities.codecs.forEach(function(codec) {
          // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
          // by adding level-asymmetry-allowed=1
          if (codec.name === 'H264' &&
              codec.parameters['level-asymmetry-allowed'] === undefined) {
            codec.parameters['level-asymmetry-allowed'] = '1';
          }
        });

        var rtpSender;
        var rtpReceiver;

        // generate an ssrc now, to be used later in rtpSender.send
        var sendEncodingParameters = [{
          ssrc: (2 * sdpMLineIndex + 1) * 1001
        }];
        if (track) {
          rtpSender = new RTCRtpSender(track, transports.dtlsTransport);
        }

        if (mline.wantReceive) {
          rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
        }

        transceivers[sdpMLineIndex] = {
          iceGatherer: transports.iceGatherer,
          iceTransport: transports.iceTransport,
          dtlsTransport: transports.dtlsTransport,
          localCapabilities: localCapabilities,
          remoteCapabilities: null,
          rtpSender: rtpSender,
          rtpReceiver: rtpReceiver,
          kind: kind,
          mid: mid,
          sendEncodingParameters: sendEncodingParameters,
          recvEncodingParameters: null
        };
      });
      if (this.usingBundle) {
        sdp += 'a=group:BUNDLE ' + transceivers.map(function(t) {
          return t.mid;
        }).join(' ') + '\r\n';
      }
      tracks.forEach(function(mline, sdpMLineIndex) {
        var transceiver = transceivers[sdpMLineIndex];
        sdp += SDPUtils.writeMediaSection(transceiver,
            transceiver.localCapabilities, 'offer', self.localStreams[0]);
      });

      this._pendingOffer = transceivers;
      var desc = new RTCSessionDescription({
        type: 'offer',
        sdp: sdp
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return Promise.resolve(desc);
    };

    window.RTCPeerConnection.prototype.createAnswer = function() {
      var self = this;

      var sdp = SDPUtils.writeSessionBoilerplate();
      if (this.usingBundle) {
        sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
          return t.mid;
        }).join(' ') + '\r\n';
      }
      this.transceivers.forEach(function(transceiver) {
        if (transceiver.isDatachannel) {
          sdp += 'm=application 0 DTLS/SCTP 5000\r\n' +
              'c=IN IP4 0.0.0.0\r\n' +
              'a=mid:' + transceiver.mid + '\r\n';
          return;
        }
        // Calculate intersection of capabilities.
        var commonCapabilities = self._getCommonCapabilities(
            transceiver.localCapabilities,
            transceiver.remoteCapabilities);

        sdp += SDPUtils.writeMediaSection(transceiver, commonCapabilities,
            'answer', self.localStreams[0]);
      });

      var desc = new RTCSessionDescription({
        type: 'answer',
        sdp: sdp
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return Promise.resolve(desc);
    };

    window.RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
      if (!candidate) {
        this.transceivers.forEach(function(transceiver) {
          transceiver.iceTransport.addRemoteCandidate({});
        });
      } else {
        var mLineIndex = candidate.sdpMLineIndex;
        if (candidate.sdpMid) {
          for (var i = 0; i < this.transceivers.length; i++) {
            if (this.transceivers[i].mid === candidate.sdpMid) {
              mLineIndex = i;
              break;
            }
          }
        }
        var transceiver = this.transceivers[mLineIndex];
        if (transceiver) {
          var cand = Object.keys(candidate.candidate).length > 0 ?
              SDPUtils.parseCandidate(candidate.candidate) : {};
          // Ignore Chrome's invalid candidates since Edge does not like them.
          if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
            return;
          }
          // Ignore RTCP candidates, we assume RTCP-MUX.
          if (cand.component !== '1') {
            return;
          }
          // A dirty hack to make samples work.
          if (cand.type === 'endOfCandidates') {
            cand = {};
          }
          transceiver.iceTransport.addRemoteCandidate(cand);

          // update the remoteDescription.
          var sections = SDPUtils.splitSections(this.remoteDescription.sdp);
          sections[mLineIndex + 1] += (cand.type ? candidate.candidate.trim()
              : 'a=end-of-candidates') + '\r\n';
          this.remoteDescription.sdp = sections.join('');
        }
      }
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return Promise.resolve();
    };

    window.RTCPeerConnection.prototype.getStats = function() {
      var promises = [];
      this.transceivers.forEach(function(transceiver) {
        ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
            'dtlsTransport'].forEach(function(method) {
              if (transceiver[method]) {
                promises.push(transceiver[method].getStats());
              }
            });
      });
      var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
          arguments[1];
      return new Promise(function(resolve) {
        // shim getStats with maplike support
        var results = new Map();
        Promise.all(promises).then(function(res) {
          res.forEach(function(result) {
            Object.keys(result).forEach(function(id) {
              results.set(id, result[id]);
              results[id] = result[id];
            });
          });
          if (cb) {
            window.setTimeout(cb, 0, results);
          }
          resolve(results);
        });
      });
    };
  }
};

// Expose public methods.
module.exports = {
  shimPeerConnection: edgeShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia')
};

},{"../utils":10,"./getusermedia":6,"sdp":1}],6:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


// Expose public methods.
module.exports = function() {
  var shimError_ = function(e) {
    return {
      name: {PermissionDeniedError: 'NotAllowedError'}[e.name] || e.name,
      message: e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name;
      }
    };
  };

  // getUserMedia error shim.
  var origGetUserMedia = navigator.mediaDevices.getUserMedia.
      bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(c) {
    return origGetUserMedia(c).catch(function(e) {
      return Promise.reject(shimError_(e));
    });
  };
};

},{}],7:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var browserDetails = require('../utils').browserDetails;

var firefoxShim = {
  shimOnTrack: function() {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function(e) {
            e.stream.getTracks().forEach(function(track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = {track: track};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
  },

  shimSourceObject: function() {
    // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this.mozSrcObject;
          },
          set: function(stream) {
            this.mozSrcObject = stream;
          }
        });
      }
    }
  },

  shimPeerConnection: function() {
    if (typeof window !== 'object' || !(window.RTCPeerConnection ||
        window.mozRTCPeerConnection)) {
      return; // probably media.peerconnection.enabled=false in about:config
    }
    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        if (browserDetails.version < 38) {
          // .urls is not supported in FF < 38.
          // create RTCIceServers with a single url.
          if (pcConfig && pcConfig.iceServers) {
            var newIceServers = [];
            for (var i = 0; i < pcConfig.iceServers.length; i++) {
              var server = pcConfig.iceServers[i];
              if (server.hasOwnProperty('urls')) {
                for (var j = 0; j < server.urls.length; j++) {
                  var newServer = {
                    url: server.urls[j]
                  };
                  if (server.urls[j].indexOf('turn') === 0) {
                    newServer.username = server.username;
                    newServer.credential = server.credential;
                  }
                  newIceServers.push(newServer);
                }
              } else {
                newIceServers.push(pcConfig.iceServers[i]);
              }
            }
            pcConfig.iceServers = newIceServers;
          }
        }
        return new mozRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype = mozRTCPeerConnection.prototype;

      // wrap static methods. Currently just generateCertificate.
      if (mozRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return mozRTCPeerConnection.generateCertificate;
          }
        });
      }

      window.RTCSessionDescription = mozRTCSessionDescription;
      window.RTCIceCandidate = mozRTCIceCandidate;
    }

    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = RTCPeerConnection.prototype[method];
          RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                RTCIceCandidate : RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        RTCPeerConnection.prototype.addIceCandidate;
    RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };

    if (browserDetails.version < 48) {
      // shim getStats with maplike support
      var makeMapStats = function(stats) {
        var map = new Map();
        Object.keys(stats).forEach(function(key) {
          map.set(key, stats[key]);
          map[key] = stats[key];
        });
        return map;
      };

      var nativeGetStats = RTCPeerConnection.prototype.getStats;
      RTCPeerConnection.prototype.getStats = function(selector, onSucc, onErr) {
        return nativeGetStats.apply(this, [selector || null])
          .then(function(stats) {
            return makeMapStats(stats);
          })
          .then(onSucc, onErr);
      };
    }
  }
};

// Expose public methods.
module.exports = {
  shimOnTrack: firefoxShim.shimOnTrack,
  shimSourceObject: firefoxShim.shimSourceObject,
  shimPeerConnection: firefoxShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia')
};

},{"../utils":10,"./getusermedia":8}],8:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var logging = require('../utils').log;
var browserDetails = require('../utils').browserDetails;

// Expose public methods.
module.exports = function() {
  var shimError_ = function(e) {
    return {
      name: {
        SecurityError: 'NotAllowedError',
        PermissionDeniedError: 'NotAllowedError'
      }[e.name] || e.name,
      message: {
        'The operation is insecure.': 'The request is not allowed by the ' +
        'user agent or the platform in the current context.'
      }[e.message] || e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  // getUserMedia constraints shim.
  var getUserMedia_ = function(constraints, onSuccess, onError) {
    var constraintsToFF37_ = function(c) {
      if (typeof c !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
        if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r. min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = {min: r.ideal, max: r.ideal};
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    constraints = JSON.parse(JSON.stringify(constraints));
    if (browserDetails.version < 38) {
      logging('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37_(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37_(constraints.video);
      }
      logging('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
      onError(shimError_(e));
    });
  };

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      getUserMedia_(constraints, resolve, reject);
    });
  };

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: getUserMediaPromise_,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
  }
  navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
        return new Promise(function(resolve) {
          var infos = [
            {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
            {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
          ];
          resolve(infos);
        });
      };

  if (browserDetails.version < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function() {
      return orgEnumerateDevices().then(undefined, function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
  if (browserDetails.version < 49) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      return origGetUserMedia(c).then(function(stream) {
        // Work around https://bugzil.la/802326
        if (c.audio && !stream.getAudioTracks().length ||
            c.video && !stream.getVideoTracks().length) {
          stream.getTracks().forEach(function(track) {
            track.stop();
          });
          throw new DOMException('The object can not be found here.',
                                 'NotFoundError');
        }
        return stream;
      }, function(e) {
        return Promise.reject(shimError_(e));
      });
    };
  }
  navigator.getUserMedia = function(constraints, onSuccess, onError) {
    if (browserDetails.version < 44) {
      return getUserMedia_(constraints, onSuccess, onError);
    }
    // Replace Firefox 44+'s deprecation warning with unprefixed version.
    console.warn('navigator.getUserMedia has been replaced by ' +
                 'navigator.mediaDevices.getUserMedia');
    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  };
};

},{"../utils":10}],9:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var safariShim = {
  // TODO: DrAlex, should be here, double check against LayoutTests
  // shimOnTrack: function() { },

  // TODO: once the back-end for the mac port is done, add.
  // TODO: check for webkitGTK+
  // shimPeerConnection: function() { },

  shimGetUserMedia: function() {
    navigator.getUserMedia = navigator.webkitGetUserMedia;
  }
};

// Expose public methods.
module.exports = {
  shimGetUserMedia: safariShim.shimGetUserMedia
  // TODO
  // shimOnTrack: safariShim.shimOnTrack,
  // shimPeerConnection: safariShim.shimPeerConnection
};

},{}],10:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var logDisabled_ = true;

// Utility methods.
var utils = {
  disableLog: function(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
    }
    logDisabled_ = bool;
    return (bool) ? 'adapter.js logging disabled' :
        'adapter.js logging enabled';
  },

  log: function() {
    if (typeof window === 'object') {
      if (logDisabled_) {
        return;
      }
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log.apply(console, arguments);
      }
    }
  },

  /**
   * Extract browser version out of the provided user agent string.
   *
   * @param {!string} uastring userAgent string.
   * @param {!string} expr Regular expression used as match criteria.
   * @param {!number} pos position in the version string to be returned.
   * @return {!number} browser version.
   */
  extractVersion: function(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos], 10);
  },

  /**
   * Browser detector.
   *
   * @return {object} result containing browser and version
   *     properties.
   */
  detectBrowser: function() {
    // Returned result object.
    var result = {};
    result.browser = null;
    result.version = null;

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
      result.browser = 'Not a browser.';
      return result;
    }

    // Firefox.
    if (navigator.mozGetUserMedia) {
      result.browser = 'firefox';
      result.version = this.extractVersion(navigator.userAgent,
          /Firefox\/([0-9]+)\./, 1);

    // all webkit-based browsers
    } else if (navigator.webkitGetUserMedia) {
      // Chrome, Chromium, Webview, Opera, all use the chrome shim for now
      if (window.webkitRTCPeerConnection) {
        result.browser = 'chrome';
        result.version = this.extractVersion(navigator.userAgent,
          /Chrom(e|ium)\/([0-9]+)\./, 2);

      // Safari or unknown webkit-based
      // for the time being Safari has support for MediaStreams but not webRTC
      } else {
        // Safari UA substrings of interest for reference:
        // - webkit version:           AppleWebKit/602.1.25 (also used in Op,Cr)
        // - safari UI version:        Version/9.0.3 (unique to Safari)
        // - safari UI webkit version: Safari/601.4.4 (also used in Op,Cr)
        //
        // if the webkit version and safari UI webkit versions are equals,
        // ... this is a stable version.
        //
        // only the internal webkit version is important today to know if
        // media streams are supported
        //
        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
          result.browser = 'safari';
          result.version = this.extractVersion(navigator.userAgent,
            /AppleWebKit\/([0-9]+)\./, 1);

        // unknown webkit-based browser
        } else {
          result.browser = 'Unsupported webkit-based browser ' +
              'with GUM support but no WebRTC support.';
          return result;
        }
      }

    // Edge.
    } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
      result.browser = 'edge';
      result.version = this.extractVersion(navigator.userAgent,
          /Edge\/(\d+).(\d+)$/, 2);

    // Default fallthrough: not supported.
    } else {
      result.browser = 'Not a supported browser.';
      return result;
    }

    return result;
  }
};

// Export.
module.exports = {
  log: utils.log,
  disableLog: utils.disableLog,
  browserDetails: utils.detectBrowser(),
  extractVersion: utils.extractVersion
};

},{}]},{},[2])(2)
});
/* global define, module, require, console, MediaStreamTrack, createIceServer, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription */
/*!
  Script: easyrtc.js

    Provides client side support for the EasyRTC framework.
    See the easyrtc_client_api.md and easyrtc_client_tutorial.md
    for more details.

  About: License

    Copyright (c) 2016, Priologic Software Inc.
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright notice,
          this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
    CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
    INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
    POSSIBILITY OF SUCH DAMAGE.
*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //RequireJS (AMD) build system
        define('easyrtc',['easyrtc_lang', 'webrtc-adapter', 'socket.io'], factory);
    } else if (typeof module === 'object' && module.exports) {
        //CommonJS build system
        module.exports = factory(require('easyrtc_lang'), require('webrtc-adapter'), require('socket.io'));
    } else {
        //Vanilla JS, ensure dependencies are loaded correctly
        if (typeof window.io === 'undefined' || !window.io) {
            throw new Error("easyrtc requires socket.io");
        }
        root.easyrtc = factory(window.easyrtc_lang, window.adapter, window.io);
  }
}(this, function (easyrtc_lang, adapter, io, undefined) {


/**
 * @class Easyrtc.
 *
 * @returns {Easyrtc} the new easyrtc instance.
 *
 * @constructs Easyrtc
 */
var Easyrtc = function() {

    var self = this;

    function logDebug (message, obj) {
        if (self.debugPrinter) {
            self.debugPrinter(message, obj);
        }
    }

    function isEmptyObj(obj) {
        if (obj === null || obj === undefined) {
            return true;
        }
        var key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }

    /** @private */
    var autoInitUserMedia = true;
    /** @private */
    var sdpLocalFilter = null;
    /** @private */
    var sdpRemoteFilter = null;
    /** @private */
    var iceCandidateFilter = null;
    /** @private */
    var iceConnectionStateChangeListener = null;
    var signalingStateChangeListener = null;
    /** @private */
    var connectionOptions =  {
        'connect timeout': 10000,
        'force new connection': true
    };

    /** @private */
    //
    // this function replaces the deprecated MediaStream.stop method
    //
    function stopStream(stream) {
       var i;
       var tracks;

       tracks = stream.getAudioTracks();
       for( i = 0; i < tracks.length; i++ ) {
           try {
             tracks[i].stop();
           } catch(err){}
       }
       tracks = stream.getVideoTracks();
       for( i = 0; i < tracks.length; i++ ) {
           try {
             tracks[i].stop();
           } catch(err){}
       }

       if (typeof stream.stop === 'function') {
           try {
             stream.stop();
           } catch(err){}
       }
    }

    /**
     * Sets functions which filter sdp records before calling setLocalDescription or setRemoteDescription.
     * This is advanced functionality which can break things, easily. See the easyrtc_rates.js file for a
     * filter builder.
     * @param {Function} localFilter a function that takes an sdp string and returns an sdp string.
     * @param {Function} remoteFilter a function that takes an sdp string and returns an sdp string.
     */
    this.setSdpFilters = function(localFilter, remoteFilter) {
        sdpLocalFilter = localFilter;
        sdpRemoteFilter = remoteFilter;
    };

    /**
     * Sets a function to warn about the peer connection closing.
     *  @param {Function} handler: a function that gets an easyrtcid as an argument.
     */
    this.setPeerClosedListener = function( handler ) {
       this.onPeerClosed = handler;
    };

    /**
     * Sets a function to warn about the peer connection open.
     *  @param {Function} handler: a function that gets an easyrtcid as an argument.
     */
    this.setPeerOpenListener = function( handler ) {
       this.onPeerOpen = handler;
    };

    /**
     * Sets a function to receive warnings about the peer connection
     * failing. The peer connection may recover by itself.
     *  @param {Function} failingHandler: a function that gets an easyrtcid as an argument.
     *  @param {Function} recoveredHandler: a function that gets an easyrtcid as an argument.
     */
    this.setPeerFailingListener = function( failingHandler, recoveredHandler ) {
       this.onPeerFailing = failingHandler;
       this.onPeerRecovered = recoveredHandler;
    };

    /**
     * Sets a function which filters IceCandidate records being sent or received.
     *
     * Candidate records can be received while they are being generated locally (before being
     * sent to a peer), and after they are received by the peer. The filter receives two arguments, the candidate record and a boolean
     * flag that is true for a candidate being received from another peer,
     * and false for a candidate that was generated locally. The candidate record has the form:
     *  {type: 'candidate', label: sdpMLineIndex, id: sdpMid, candidate: candidateString}
     * The function should return one of the following: the input candidate record, a modified candidate record, or null (indicating that the
     * candidate should be discarded).
     * @param {Function} filter
     */
    this.setIceCandidateFilter = function(filter) {
        iceCandidateFilter = filter;
    };

    /**
     * Sets a function that listens on IceConnectionStateChange events.
     *
     * During ICE negotiation the peer connection fires the iceconnectionstatechange event.
     * It is sometimes useful for the application to learn about these changes, especially if the ICE connection fails.
     * The function should accept three parameters: the easyrtc id of the peer, the iceconnectionstatechange event target and the iceconnectionstate.
     * @param {Function} listener
     */
    this.setIceConnectionStateChangeListener = function(listener) {
       iceConnectionStateChangeListener = listener;
    };

    /**
     * Sets a function that listens on SignalingStateChange events.
     *
     * During ICE negotiation the peer connection fires the signalingstatechange event.
     * The function should accept three parameters: the easyrtc id of the peer, the signalingstatechange event target and the signalingstate.
     * @param {Function} listener
     */
    this.setSignalingStateChangeListener = function(listener) {
       signalingStateChangeListener = listener;
    };

    /**
     * Controls whether a default local media stream should be acquired automatically during calls and accepts
     * if a list of streamNames is not supplied. The default is true, which mimics the behaviour of earlier releases
     * that didn't support multiple streams. This function should be called before easyrtc.call or before entering an
     * accept  callback.
     * @param {Boolean} flag true to allocate a default local media stream.
     */
    this.setAutoInitUserMedia = function(flag) {
        autoInitUserMedia = !!flag;
    };

    /**
     * This function performs a printf like formatting. It actually takes an unlimited
     * number of arguments, the declared arguments arg1, arg2, arg3 are present just for
     * documentation purposes.
     * @param {String} format A string like "abcd{1}efg{2}hij{1}."
     * @param {String} arg1 The value that replaces {1}
     * @param {String} arg2 The value that replaces {2}
     * @param {String} arg3 The value that replaces {3}
     * @returns {String} the formatted string.
     */
    this.format = function(format, arg1, arg2, arg3) {
        var formatted = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            var regexp = new RegExp('\\{' + (i - 1) + '\\}', 'gi');
            formatted = formatted.replace(regexp, arguments[i]);
        }
        return formatted;
    };

    /**
     * This function checks if a socket is actually connected.
     * @private
     * @param {Object} socket a socket.io socket.
     * @return true if the socket exists and is connected, false otherwise.
    */
    function isSocketConnected(socket) {
       return socket && (
            (socket.socket && socket.socket.connected) || socket.connected
        );
    }

    /** @private */
    //
    // Maps a key to a language specific string using the easyrtc_lang map.
    // Defaults to the key if the key can not be found, but outputs a warning in that case.
    // This function is only used internally by easyrtc.js
    //
    var haveAudioVideo = {
        audio: false,
        video: false
    };

    /**
     * @private
     * @param {String} key
     */
    this.getConstantString = function(key) {
        if (easyrtc_lang[key]) {
            return easyrtc_lang[key];
        }
        else {
            self.showError(self.errCodes.DEVELOPER_ERR, "Could not find key='" + key + "' in easyrtc_lang");
            return key;
        }
    };

    /** @private */
    //
    // this is a list of the events supported by the generalized event listener.
    //
    var allowedEvents = {
        roomOccupant: true,  // this receives the list of everybody in any room you belong to
        roomOccupants: true  // this receives a {roomName:..., occupants:...} value for a specific room
    };

    /** @private */
    //
    // A map of eventListeners. The key is the event type.
    //
    var eventListeners = {};

    /**
     * This function checks if an attempt was made to add an event listener or
     * or emit an unlisted event, since such is typically a typo.
     * @private
     * @param {String} eventName
     * @param {String} callingFunction the name of the calling function.
     */
    function event(eventName, callingFunction) {
        if (typeof eventName !== 'string') {
            self.showError(self.errCodes.DEVELOPER_ERR, callingFunction + " called without a string as the first argument");
            throw "developer error";
        }
        if (!allowedEvents[eventName]) {
            self.showError(self.errCodes.DEVELOPER_ERR, callingFunction + " called with a bad event name = " + eventName);
            throw "developer error";
        }
    }

    /**
     * Adds an event listener for a particular type of event.
     * Currently the only eventName supported is "roomOccupant".
     * @param {String} eventName the type of the event
     * @param {Function} eventListener the function that expects the event.
     * The eventListener gets called with the eventName as it's first argument, and the event
     * data as it's second argument.
     * @returns {void}
     */
    this.addEventListener = function(eventName, eventListener) {
        event(eventName, "addEventListener");
        if (typeof eventListener !== 'function') {
            self.showError(self.errCodes.DEVELOPER_ERR, "addEventListener called with a non-function for second argument");
            throw "developer error";
        }
        //
        // remove the event listener if it's already present so we don't end up with two copies
        //
        self.removeEventListener(eventName, eventListener);
        if (!eventListeners[eventName]) {
            eventListeners[eventName] = [];
        }
        eventListeners[eventName][eventListeners[eventName].length] = eventListener;
    };

    /**
     * Removes an event listener.
     * @param {String} eventName
     * @param {Function} eventListener
     */
    this.removeEventListener = function(eventName, eventListener) {
        event(eventName, "removeEventListener");
        var listeners = eventListeners[eventName];
        var i = 0;
        if (listeners) {
            for (i = 0; i < listeners.length; i++) {
                if (listeners[i] === eventListener) {
                    if (i < listeners.length - 1) {
                        listeners[i] = listeners[listeners.length - 1];
                    }
                    listeners.length = listeners.length - 1;
                }
            }
        }
    };

    /**
     * Emits an event, or in other words, calls all the eventListeners for a
     * particular event.
     * @param {String} eventName
     * @param {Object} eventData
     */
    this.emitEvent = function(eventName, eventData) {
        event(eventName, "emitEvent");
        var listeners = eventListeners[eventName];
        var i = 0;
        if (listeners) {
            for (i = 0; i < listeners.length; i++) {
                listeners[i](eventName, eventData);
            }
        }
    };

    /**
     * Error codes that the EasyRTC will use in the errorCode field of error object passed
     * to error handler set by easyrtc.setOnError. The error codes are short printable strings.
     * @type Object
     */
    this.errCodes = {
        BAD_NAME: "BAD_NAME", // a user name wasn't of the desired form
        CALL_ERR: "CALL_ERR", // something went wrong creating the peer connection
        DEVELOPER_ERR: "DEVELOPER_ERR", // the developer using the EasyRTC library made a mistake
        SYSTEM_ERR: "SYSTEM_ERR", // probably an error related to the network
        CONNECT_ERR: "CONNECT_ERR", // error occurred when trying to create a connection
        MEDIA_ERR: "MEDIA_ERR", // unable to get the local media
        MEDIA_WARNING: "MEDIA_WARNING", // didn't get the desired resolution
        INTERNAL_ERR: "INTERNAL_ERR",
        PEER_GONE: "PEER_GONE", // peer doesn't exist
        ALREADY_CONNECTED: "ALREADY_CONNECTED",
        BAD_CREDENTIAL: "BAD_CREDENTIAL",
        ICECANDIDATE_ERR: "ICECANDIDATE_ERR",
        NOVIABLEICE: "NOVIABLEICE",
        SIGNAL_ERR: "SIGNAL_ERR"
    };

    this.apiVersion = "1.1.0";

    /** Most basic message acknowledgment object */
    this.ackMessage = {msgType: "ack"};

    /** Regular expression pattern for user ids. This will need modification to support non US character sets */
    this.usernameRegExp = /^(.){1,64}$/;

    /** Default cookieId name */
    this.cookieId = "easyrtcsid";

    /** @private */
    var username = null;

    /** Flag to indicate that user is currently logging out */
    this.loggingOut = false;

    /** @private */
    this.disconnecting = false;

    /** @private */
    //
    // A map of ids to local media streams.
    //
    var namedLocalMediaStreams = {};

    /** @private */
    var sessionFields = [];

    /** @private */
    var receivedMediaConstraints = {};

    /**
     * Control whether the client requests audio from a peer during a call.
     * Must be called before the call to have an effect.
     * @param value - true to receive audio, false otherwise. The default is true.
     */
    this.enableAudioReceive = function(value) {
        if (
            adapter && adapter.browserDetails &&
             (adapter.browserDetails.browser === "firefox" || adapter.browserDetails.browser === "edge")
        ) {
            receivedMediaConstraints.offerToReceiveAudio = value;
        }
        else {
            receivedMediaConstraints.mandatory = receivedMediaConstraints.mandatory || {};
            receivedMediaConstraints.mandatory.OfferToReceiveAudio = value;
        }
    };

    /**
     * Control whether the client requests video from a peer during a call.
     * Must be called before the call to have an effect.
     * @param value - true to receive video, false otherwise. The default is true.
     */
    this.enableVideoReceive = function(value) {
        if (
            adapter && adapter.browserDetails &&
             (adapter.browserDetails.browser === "firefox" || adapter.browserDetails.browser === "edge")
        ) {
           receivedMediaConstraints.offerToReceiveVideo = value;
        }
        else {
            receivedMediaConstraints.mandatory = receivedMediaConstraints.mandatory || {};
            receivedMediaConstraints.mandatory.OfferToReceiveVideo = value;
        }
    };

    // True by default
    // TODO should not be true by default only for legacy
    this.enableAudioReceive(true);
    this.enableVideoReceive(true);

    function getSourceList(callback, sourceType) {
        navigator.mediaDevices.enumerateDevices().then(
             function(values) {
                var results = [];
                for (var i = 0; i < values.length; i++) {
                    var source = values[i];
                    if (source.kind === sourceType) {
                        source.id = source.deviceId; //backwards compatibility
                        results.push(source);
                    }
                }
                callback(results);
             }
          ).catch(
            function(reason) {
               logDebug("Unable to enumerate devices (" + reason + ")");
            }
        );
    }

    /**
     * Sets the audio output device of a Video object.
     * That is to say, this controls what speakers get the sound.
     * In theory, this works on Chrome but probably doesn't work anywhere else yet.
     * This code was cribbed from https://webrtc.github.io/samples/src/content/devices/multi/.
     *  @param {Object} element an HTML5 video element
     *  @param {String} sinkId a deviceid from getAudioSinkList
     */
    this.setAudioOutput = function(element, sinkId) {
       if (typeof element.sinkId !== 'undefined') {
          element.setSinkId(sinkId)
          .then(function() {
            logDebug('Success, audio output device attached: ' + sinkId + ' to ' +
                'element with ' + element.title + ' as source.');
          })
          .catch(function(error) {
            var errorMessage = error;
            if (error.name === 'SecurityError') {
              errorMessage = 'You need to use HTTPS for selecting audio output ' +
                  'device: ' + error;
            }
            logDebug(errorMessage);
          });
       } else {
          logDebug('Browser does not support output device selection.');
       }
    };

    /**
     * Gets a list of the available audio sinks (ie, speakers)
     * @param {Function} callback receives list of {deviceId:String, groupId:String, label:String, kind:"audio"}
     * @example  easyrtc.getAudioSinkList( function(list) {
     *               var i;
     *               for( i = 0; i < list.length; i++ ) {
     *                   console.log("label=" + list[i].label + ", id= " + list[i].deviceId);
     *               }
     *          });
     */
    this.getAudioSinkList = function(callback){
       getSourceList(callback, "audiooutput");
    };
    /**
     * Gets a list of the available audio sources (ie, microphones)
     * @param {Function} callback receives list of {deviceId:String, groupId:String, label:String, kind:"audio"}
     * @example  easyrtc.getAudioSourceList( function(list) {
     *               var i;
     *               for( i = 0; i < list.length; i++ ) {
     *                   console.log("label=" + list[i].label + ", id= " + list[i].deviceId);
     *               }
     *          });
     */
    this.getAudioSourceList = function(callback){
       getSourceList(callback, "audioinput");
    };

    /**
     * Gets a list of the available video sources (ie, cameras)
     * @param {Function} callback receives list of {deviceId:String, groupId:String, label:String, kind:"video"}
     * @example  easyrtc.getVideoSourceList( function(list) {
     *               var i;
     *               for( i = 0; i < list.length; i++ ) {
     *                   console.log("label=" + list[i].label + ", id= " + list[i].deviceId);
     *               }
     *          });
     */
    this.getVideoSourceList = function(callback) {
       getSourceList(callback, "videoinput");
    };


    /** @private */
    var dataChannelName = "dc";
    /** @private */
    var oldConfig = {};
    /** @private */
    var offersPending = {};
    /** @private */
    var credential = null;

    /** @private */
    self.audioEnabled = true;
    /** @private */
    self.videoEnabled = true;
    /** @private */
    this.debugPrinter = null;
    /** Your easyrtcid */
    this.myEasyrtcid = "";

    /** The height of the local media stream video in pixels. This field is set an indeterminate period
     * of time after easyrtc.initMediaSource succeeds. Note: in actuality, the dimensions of a video stream
     * change dynamically in response to external factors, you should check the videoWidth and videoHeight attributes
     * of your video objects before you use them for pixel specific operations.
     */
    this.nativeVideoHeight = 0;

    /** This constant determines how long (in bytes) a message can be before being split in chunks of that size.
    * This is because there is a limitation of the length of the message you can send on the
    * data channel between browsers.
    */
    this.maxP2PMessageLength = 1000;

    /** The width of the local media stream video in pixels. This field is set an indeterminate period
     * of time after easyrtc.initMediaSource succeeds.  Note: in actuality, the dimensions of a video stream
     * change dynamically in response to external factors, you should check the videoWidth and videoHeight attributes
     * of your video objects before you use them for pixel specific operations.
     */
    this.nativeVideoWidth = 0;

    /** The rooms the user is in. This only applies to room oriented applications and is set at the same
     * time a token is received.
     */
    this.roomJoin = {};

    /** Checks if the supplied string is a valid user name (standard identifier rules)
     * @param {String} name
     * @return {Boolean} true for a valid user name
     * @example
     *    var name = document.getElementById('nameField').value;
     *    if( !easyrtc.isNameValid(name)){
     *        console.error("Bad user name");
     *    }
     */
    this.isNameValid = function(name) {
        return self.usernameRegExp.test(name);
    };

    /**
     * This function sets the name of the cookie that client side library will look for
     * and transmit back to the server as it's easyrtcsid in the first message.
     * @param {String} cookieId
     */
    this.setCookieId = function(cookieId) {
        self.cookieId = cookieId;
    };

    /** @private */
    this._desiredVideoProperties = {}; // default camera

    /**
     * Specify particular video source. Call this before you call easyrtc.initMediaSource().
     * @param {String} videoSrcId is a id value from one of the entries fetched by getVideoSourceList. null for default.
     * @example easyrtc.setVideoSource( videoSrcId);
     */
    this.setVideoSource = function(videoSrcId) {
        self._desiredVideoProperties.videoSrcId = videoSrcId;
        delete self._desiredVideoProperties.screenCapture;
    };

    /** @private */
    this._desiredAudioProperties = {}; // default camera

    /**
     * Specify particular video source. Call this before you call easyrtc.initMediaSource().
     * @param {String} audioSrcId is a id value from one of the entries fetched by getAudioSourceList. null for default.
     * @example easyrtc.setAudioSource( audioSrcId);
     */
    this.setAudioSource = function(audioSrcId) {
        self._desiredAudioProperties.audioSrcId = audioSrcId;
    };

    /** This function is used to set the dimensions of the local camera, usually to get HD.
     *  If called, it must be called before calling easyrtc.initMediaSource (explicitly or implicitly).
     *  assuming it is supported. If you don't pass any parameters, it will use default camera dimensions.
     * @param {Number} width in pixels
     * @param {Number} height in pixels
     * @param {number} frameRate is optional
     * @example
     *    easyrtc.setVideoDims(1280,720);
     * @example
     *    easyrtc.setVideoDims();
     */
    this.setVideoDims = function(width, height, frameRate) {
        self._desiredVideoProperties.width = width;
        self._desiredVideoProperties.height = height;
        if (frameRate !== undefined) {
            self._desiredVideoProperties.frameRate = frameRate;
        }
    };

    /** This function requests that screen capturing be used to provide the local media source
     * rather than a webcam. If you have multiple screens, they are composited side by side.
     * Note: this functionality is not supported by Firefox, has to be called before calling initMediaSource (or easyApp), we don't currently supply a way to
     * turn it off (once it's on), only works if the website is hosted SSL (https), and the image quality is rather
     * poor going across a network because it tries to transmit so much data. In short, screen sharing
     * through WebRTC isn't worth using at this point, but it is provided here so people can try it out.
     * @example
     *    easyrtc.setScreenCapture();
     * @deprecated: use easyrtc.initScreenCapture (same parameters as easyrtc.initMediaSource.
     */
    this.setScreenCapture = function(enableScreenCapture) {
        self._desiredVideoProperties.screenCapture = (enableScreenCapture !== false);
    };

    /**
     * Builds the constraint object passed to getUserMedia.
     * @returns {Object} mediaConstraints
     */
    self.getUserMediaConstraints = function() {
        var constraints = {};
        //
        // _presetMediaConstraints allow you to provide your own constraints to be used
        // with initMediaSource.
        //
        if (self._presetMediaConstraints) {
            constraints = self._presetMediaConstraints;
            delete self._presetMediaConstraints;
            return constraints;
        }
        else if (self._desiredVideoProperties.screenCapture) {
            return {
                video: {
                    mandatory: {
                        chromeMediaSource: 'screen',
                        maxWidth: screen.width,
                        maxHeight: screen.height,
                        minWidth: screen.width,
                        minHeight: screen.height,
                        minFrameRate: 1,
                        maxFrameRate: 5},
                    optional: []
                },
                audio: false
            };
        }
        else if (!self.videoEnabled) {
            constraints.video = false;
        }
        else {

            // Tested Firefox 49 and MS Edge require minFrameRate and maxFrameRate
            // instead max,min,ideal that cause GetUserMedia failure.
            // Until confirmed both browser support idea,max and min we need this.
            if (
                adapter && adapter.browserDetails &&
                    (adapter.browserDetails.browser === "firefox" || adapter.browserDetails.browser === "edge")
            ) {
                constraints.video = {};
                if (self._desiredVideoProperties.width) {
                    constraints.video.width = self._desiredVideoProperties.width;
                }
                if (self._desiredVideoProperties.height) {
                    constraints.video.height = self._desiredVideoProperties.height;
                }
                if (self._desiredVideoProperties.frameRate) {
                    constraints.video.frameRate = {
                        minFrameRate: self._desiredVideoProperties.frameRate,
                        maxFrameRate: self._desiredVideoProperties.frameRate
                    };
                }
                if (self._desiredVideoProperties.videoSrcId) {
                    constraints.video.deviceId = self._desiredVideoProperties.videoSrcId;
                }

            // chrome and opera
            } else {
                constraints.video = {};
                if (self._desiredVideoProperties.width) {
                     constraints.video.width = {
                        max: self._desiredVideoProperties.width,
                        min : self._desiredVideoProperties.width,
                        ideal : self._desiredVideoProperties.width
                     };
                }
                if (self._desiredVideoProperties.height) {
                    constraints.video.height = {
                        max: self._desiredVideoProperties.height,
                        min: self._desiredVideoProperties.height,
                        ideal: self._desiredVideoProperties.height
                    };
                }
                if (self._desiredVideoProperties.frameRate) {
                    constraints.video.frameRate = {
                        max: self._desiredVideoProperties.frameRate,
                        ideal: self._desiredVideoProperties.frameRate
                    };
                }
                if (self._desiredVideoProperties.videoSrcId) {
                    constraints.video.deviceId = self._desiredVideoProperties.videoSrcId;
                }
                // hack for opera
                if (Object.keys(constraints.video).length === 0 ) {
                    constraints.video = true;
                }
            }
        }

        if (!self.audioEnabled) {
            constraints.audio = false;
        }
        else {
            if (adapter && adapter.browserDetails && adapter.browserDetails.browser === "firefox") {
                constraints.audio = {};
                if (self._desiredAudioProperties.audioSrcId) {
                    constraints.audio.deviceId = self._desiredAudioProperties.audioSrcId;
                }
            }
            else { // chrome and opera
                constraints.audio = {mandatory: {}, optional: []};
                if (self._desiredAudioProperties.audioSrcId) {
                    constraints.audio.optional = constraints.audio.optional || [];
                    constraints.audio.optional.push({deviceId: self._desiredAudioProperties.audioSrcId});
                }
            }
        }
        return constraints;
    };

    /** Set the application name. Applications can only communicate with other applications
     * that share the same API Key and application name. There is no predefined set of application
     * names. Maximum length is
     * @param {String} name
     * @example
     *    easyrtc.setApplicationName('simpleAudioVideo');
     */
    this.setApplicationName = function(name) {
        self.applicationName = name;
    };

    /** Enable or disable logging to the console.
     * Note: if you want to control the printing of debug messages, override the
     *    easyrtc.debugPrinter variable with a function that takes a message string as it's argument.
     *    This is exactly what easyrtc.enableDebug does when it's enable argument is true.
     * @param {Boolean} enable - true to turn on debugging, false to turn off debugging. Default is false.
     * @example
     *    easyrtc.enableDebug(true);
     */
    this.enableDebug = function(enable) {
        if (enable) {
            self.debugPrinter = function(message, obj) {
                var now = new Date().toISOString();
                var stackString = new Error().stack;
                var srcLine = "location unknown";
                if (stackString) {
                    var stackFrameStrings = stackString.split('\n');
                    srcLine = "";
                    if (stackFrameStrings.length >= 5) {
                        srcLine = stackFrameStrings[4];
                    }
                }

                console.log("debug " + now + " : " + message + " [" + srcLine + "]");

                if (typeof obj !== 'undefined') {
                    console.log("debug " + now + " : ", obj);
                }
            };
        }
        else {
            self.debugPrinter = null;
        }
    };

    /**
     * Determines if the local browser supports WebRTC GetUserMedia (access to camera and microphone).
     * @returns {Boolean} True getUserMedia is supported.
     */
    this.supportsGetUserMedia = function() {
        return typeof navigator.getUserMedia !== 'undefined';
    };

    /**
     * Determines if the local browser supports WebRTC Peer connections to the extent of being able to do video chats.
     * @returns {Boolean} True if Peer connections are supported.
     */
    this.supportsPeerConnections = function() {
        return typeof RTCPeerConnection !== 'undefined';
    };

    /** Determines whether the current browser supports the new data channels.
     * EasyRTC will not open up connections with the old data channels.
     * @returns {Boolean}
     */
    this.supportsDataChannels = function() {

        var hasCreateDataChannel = false;

        if (self.supportsPeerConnections()) {
            try {
                var peer = new RTCPeerConnection({iceServers: []}, {});
                hasCreateDataChannel = typeof peer.createDataChannel !== 'undefined';
                peer.close();
            }
            catch (err) {
                // Ignore possible RTCPeerConnection.close error
                // hasCreateDataChannel should reflect the feature state still.
            }
        }

        return hasCreateDataChannel;
    };

    /** @private */
    //
    // Experimental function to determine if statistics gathering is supported.
    //
    this.supportsStatistics = function() {

        var hasGetStats = false;

        if (self.supportsPeerConnections()) {
            try {
                var peer = new RTCPeerConnection({iceServers: []}, {});
                hasGetStats = typeof peer.getStats !== 'undefined';
                peer.close();
            }
            catch (err) {
                // Ingore possible RTCPeerConnection.close error
                // hasCreateDataChannel should reflect the feature state still.
            }
        }

        return hasGetStats;
    };

    /** @private
     * @param {Array} pc_config ice configuration array
     * @param {Object} optionalStuff peer constraints.
     */
    this.createRTCPeerConnection = function(pc_config, optionalStuff) {
        if (self.supportsPeerConnections()) {
            return new RTCPeerConnection(pc_config, optionalStuff);
        }
        else {
            throw "Your browser doesn't support webRTC (RTCPeerConnection)";
        }
    };

    //
    // this should really be part of adapter.js
    // Versions of chrome < 31 don't support reliable data channels transport.
    // Firefox does.
    //
    this.getDatachannelConstraints = function() {
        return {
            reliable: adapter && adapter.browserDetails &&
                adapter.browserDetails.browser !== "chrome" &&
                    adapter.browserDetails.version < 31
        };
    };

    /** @private */
    haveAudioVideo = {
        audio: false,
        video: false
    };
    /** @private */
    var dataEnabled = false;
    /** @private */
    var serverPath = null; // this was null, but that was generating an error.
    /** @private */
    var roomOccupantListener = null;
    /** @private */
    var onDataChannelOpen = null;
    /** @private */
    var onDataChannelClose = null;
    /** @private */
    var lastLoggedInList = {};
    /** @private */
    var receivePeer = {msgTypes: {}};
    /** @private */
    var receiveServerCB = null;
    /** @private */
    // dummy placeholder for when we aren't connected
    var updateConfigurationInfo = function() { };
    /** @private */
    //
    //
    //  peerConns is a map from caller names to the below object structure
    //     {  startedAV: boolean,  -- true if we have traded audio/video streams
    //        dataChannelS: RTPDataChannel for outgoing messages if present
    //        dataChannelR: RTPDataChannel for incoming messages if present
    //        dataChannelReady: true if the data channel can be used for sending yet
    //        connectTime: timestamp when the connection was started
    //        sharingAudio: true if audio is being shared
    //        sharingVideo: true if video is being shared
    //        cancelled: temporarily true if a connection was cancelled by the peer asking to initiate it
    //        candidatesToSend: SDP candidates temporarily queued
    //        streamsAddedAcks: ack callbacks waiting for stream received messages
    //        pc: RTCPeerConnection
    //        mediaStream: mediaStream
    //     function callSuccessCB(string) - see the easyrtc.call documentation.
    //        function callFailureCB(errorCode, string) - see the easyrtc.call documentation.
    //        function wasAcceptedCB(boolean,string) - see the easyrtc.call documentation.
    //     }
    //
    var peerConns = {};
    /** @private */
    //
    // a map keeping track of whom we've requested a call with so we don't try to
    // call them a second time before they've responded.
    //
    var acceptancePending = {};

    /** @private
     * @param {string} caller
     * @param {Function} helper
     */
    this.acceptCheck = function(caller, helper) {
        helper(true);
    };

    /** @private
     * @param {string} easyrtcid
     * @param {HTMLMediaStream} stream
     */
    this.streamAcceptor = function(easyrtcid, stream) {
    };

    /** @private
     * @param {string} easyrtcid
     */
    this.onStreamClosed = function(easyrtcid) {
    };

    /** @private
     * @param {string} easyrtcid
     */
    this.callCancelled = function(easyrtcid) {
    };

    /**
     * This function gets the raw RTCPeerConnection for a given easyrtcid
     * @param {String} easyrtcid
     * @param {RTCPeerConnection} for that easyrtcid, or null if no connection exists
     * Submitted by Fabian Bernhard.
     */
    this.getPeerConnectionByUserId = function(userId) {
        if (peerConns && peerConns[userId]) {
            return peerConns[userId].pc;
        }
        return null;
    };


    var chromeStatsFilter = [
        {
            "googTransmitBitrate": "transmitBitRate",
            "googActualEncBitrate": "encodeRate",
            "googAvailableSendBandwidth": "availableSendRate"
        },
        {
            "googCodecName": "audioCodec",
            "googTypingNoiseState": "typingNoise",
            "packetsSent": "audioPacketsSent",
            "bytesSent": "audioBytesSent"
        },
        {
            "googCodecName": "videoCodec",
            "googFrameRateSent": "outFrameRate",
            "packetsSent": "videoPacketsSent",
            "bytesSent": "videoBytesSent"
        },
        {
            "packetsLost": "videoPacketsLost",
            "packetsReceived": "videoPacketsReceived",
            "bytesReceived": "videoBytesReceived",
            "googFrameRateOutput": "frameRateOut"
        },
        {
            "packetsLost": "audioPacketsLost",
            "packetsReceived": "audioPacketsReceived",
            "bytesReceived": "audioBytesReceived",
            "audioOutputLevel": "audioOutputLevel"
        },
        {
            "googRemoteAddress": "remoteAddress",
            "googActiveConnection": "activeConnection"
        },
        {
            "audioInputLevel": "audioInputLevel"
        }
    ];

    var firefoxStatsFilter = {
        "outboundrtp_audio.bytesSent": "audioBytesSent",
        "outboundrtp_video.bytesSent": "videoBytesSent",
        "inboundrtp_video.bytesReceived": "videoBytesReceived",
        "inboundrtp_audio.bytesReceived": "audioBytesReceived",
        "outboundrtp_audio.packetsSent": "audioPacketsSent",
        "outboundrtp_video.packetsSent": "videoPacketsSent",
        "inboundrtp_video.packetsReceived": "videoPacketsReceived",
        "inboundrtp_audio.packetsReceived": "audioPacketsReceived",
        "inboundrtp_video.packetsLost": "videoPacketsLost",
        "inboundrtp_audio.packetsLost": "audioPacketsLost",
        "firefoxRemoteAddress": "remoteAddress"
    };

    var standardStatsFilter = adapter && adapter.browserDetails &&
                adapter.browserDetails.browser === "firefox" ? firefoxStatsFilter : chromeStatsFilter;

    function getFirefoxPeerStatistics(peerId, callback, filter) {


        if (!peerConns[peerId]) {
            callback(peerId, {"connected": false});
        }
        else if (peerConns[peerId].pc.getStats) {
            peerConns[peerId].pc.getStats(null, function(stats) {
                var items = {};
                var candidates = {};
                var activeId = null;
                var srcKey;
                //
                // the stats objects has a group of entries. Each entry is either an rtcp, rtp entry
                // or a candidate entry.
                //
                if (stats) {
                    stats.forEach(function(entry) {
                        var majorKey;
                        var subKey;
                        if (entry.type.match(/boundrtp/)) {
                            if (entry.id.match(/audio/)) {
                                majorKey = entry.type + "_audio";
                            }
                            else if (entry.id.match(/video/)) {
                                majorKey = entry.type + "_video";
                            }
                            else {
                                return;
                            }
                            for (subKey in entry) {
                                if (entry.hasOwnProperty(subKey)) {
                                    items[majorKey + "." + subKey] = entry[subKey];
                                }
                            }
                        }
                        else {
                            if( entry.hasOwnProperty("ipAddress") && entry.id) {
                                candidates[entry.id] = entry.ipAddress + ":" +
                                      entry.portNumber;
                            }
                            else if( entry.hasOwnProperty("selected") &&
                                     entry.hasOwnProperty("remoteCandidateId") &&
                                     entry.selected ) {
                                activeId =  entry.remoteCandidateId;
                            }
                        }
                    });
                }

                if( activeId ) {
                    items["firefoxRemoteAddress"] = candidates[activeId];
                }
                if (!filter) {
                    callback(peerId, items);
                }
                else {
                    var filteredItems = {};
                    for (srcKey in filter) {
                        if (filter.hasOwnProperty(srcKey) && items.hasOwnProperty(srcKey)) {
                            filteredItems[ filter[srcKey]] = items[srcKey];
                        }
                    }
                    callback(peerId, filteredItems);
                }
            },
                    function(error) {
                        logDebug("unable to get statistics");
                    });
        }
        else {
            callback(peerId, {"statistics": self.getConstantString("statsNotSupported")});
        }
    }

    function getChromePeerStatistics(peerId, callback, filter) {

        if (!peerConns[peerId]) {
            callback(peerId, {"connected": false});
        }
        else if (peerConns[peerId].pc.getStats) {

            peerConns[peerId].pc.getStats(function(stats) {

                var localStats = {};
                var part, parts = stats.result();
                var i, j;
                var itemKeys;
                var itemKey;
                var names;
                var userKey;
                var partNames = [];
                var partList;
                var bestBytes = 0;
                var bestI;
                var turnAddress = null;
                var hasActive, curReceived;
                var localAddress, remoteAddress;
                if (!filter) {
                    for (i = 0; i < parts.length; i++) {
                        names = parts[i].names();
                        for (j = 0; j < names.length; j++) {
                            itemKey = names[j];
                            localStats[parts[i].id + "." + itemKey] = parts[i].stat(itemKey);
                        }
                    }
                }
                else {
                    for (i = 0; i < parts.length; i++) {
                        partNames[i] = {};
                        //
                        // convert the names into a dictionary
                        //
                        names = parts[i].names();
                        for (j = 0; j < names.length; j++) {
                            partNames[i][names[j]] = true;
                        }

                        //
                        // a chrome-firefox connection results in several activeConnections.
                        // we only want one, so we look for the one with the most data being received on it.
                        //
                        if (partNames[i].googRemoteAddress && partNames[i].googActiveConnection) {
                            hasActive = parts[i].stat("googActiveConnection");
                            if (hasActive === true || hasActive === "true") {
                                curReceived = parseInt(parts[i].stat("bytesReceived")) +
                                        parseInt(parts[i].stat("bytesSent"));
                                if (curReceived > bestBytes) {
                                    bestI = i;
                                    bestBytes = curReceived;
                                }
                            }
                        }
                    }

                    for (i = 0; i < parts.length; i++) {
                        //
                        // discard info from any inactive connection.
                        //
                        if (partNames[i].googActiveConnection) {
                            if (i !== bestI) {
                                partNames[i] = {};
                            }
                            else {
                                localAddress = parts[i].stat("googLocalAddress").split(":")[0];
                                remoteAddress = parts[i].stat("googRemoteAddress").split(":")[0];
                                if (self.isTurnServer(localAddress)) {
                                    turnAddress = localAddress;
                                }
                                else if (self.isTurnServer(remoteAddress)) {
                                    turnAddress = remoteAddress;
                                }
                            }
                        }
                    }

                    for (i = 0; i < filter.length; i++) {
                        itemKeys = filter[i];
                        partList = [];
                        part = null;
                        for (j = 0; j < parts.length; j++) {
                            var fullMatch = true;
                            for (itemKey in itemKeys) {
                                if (itemKeys.hasOwnProperty(itemKey) && !partNames[j][itemKey]) {
                                    fullMatch = false;
                                    break;
                                }
                            }
                            if (fullMatch && parts[j]) {
                                partList.push(parts[j]);
                            }
                        }
                        if (partList.length === 1) {
                            for (j = 0; j < partList.length; j++) {
                                part = partList[j];
                                if (part) {
                                    for (itemKey in itemKeys) {
                                        if (itemKeys.hasOwnProperty(itemKey)) {
                                            userKey = itemKeys[itemKey];
                                            localStats[userKey] = part.stat(itemKey);
                                        }
                                    }
                                }
                            }
                        }
                        else if (partList.length > 1) {
                            for (itemKey in itemKeys) {
                                if (itemKeys.hasOwnProperty(itemKey)) {
                                    localStats[itemKeys[itemKey]] = [];
                                }
                            }
                            for (j = 0; j < partList.length; j++) {
                                part = partList[j];
                                    for (itemKey in itemKeys) {
                                        if (itemKeys.hasOwnProperty(itemKey)) {
                                            userKey = itemKeys[itemKey];
                                            localStats[userKey].push(part.stat(itemKey));
                                        }
                                    }
                            }
                        }
                    }
                }

                if (localStats.remoteAddress && turnAddress) {
                    localStats.remoteAddress = turnAddress;
                }
                callback(peerId, localStats);
            });
        }
        else {
            callback(peerId, {"statistics": self.getConstantString("statsNotSupported")});
        }
    }

    /**
     * This function gets the statistics for a particular peer connection.
     * @param {String} easyrtcid
     * @param {Function} callback gets the easyrtcid for the peer and a map of {userDefinedKey: value}. If there is no peer connection to easyrtcid, then the map will
     *  have a value of {connected:false}.
     * @param {Object} filter depends on whether Chrome or Firefox is used. See the default filters for guidance.
     * It is still experimental.
     */
    this.getPeerStatistics = function(easyrtcid, callback, filter) {
        if (
            adapter && adapter.browserDetails &&
                adapter.browserDetails.browser === "firefox"
        ) {
            getFirefoxPeerStatistics(easyrtcid, callback, filter);
        }
        else {
            getChromePeerStatistics(easyrtcid, callback, filter);
        }
    };

    /**
     * @private
     * @param roomName
     * @param fields
     */
    function sendRoomApiFields(roomName, fields) {
        var fieldAsString = JSON.stringify(fields);
        JSON.parse(fieldAsString);
        var dataToShip = {
            msgType: "setRoomApiField",
            msgData: {
                setRoomApiField: {
                    roomName: roomName,
                    field: fields
                }
            }
        };
        self.webSocket.json.emit("easyrtcCmd", dataToShip,
                function(ackMsg) {
                    if (ackMsg.msgType === "error") {
                        self.showError(ackMsg.msgData.errorCode, ackMsg.msgData.errorText);
                    }
                }
        );
    }

    /** @private */
    var roomApiFieldTimer = null;

    /**
     * @private
     * @param {String} roomName
     */
    function enqueueSendRoomApi(roomName) {
        //
        // Rather than issue the send request immediately, we set a timer so we can accumulate other
        // calls
        //
        if (roomApiFieldTimer) {
            clearTimeout(roomApiFieldTimer);
        }
        roomApiFieldTimer = setTimeout(function() {
            sendRoomApiFields(roomName, self._roomApiFields[roomName]);
            roomApiFieldTimer = null;
        }, 10);
    }

    /** Provide a set of application defined fields that will be part of this instances
     * configuration information. This data will get sent to other peers via the websocket
     * path.
     * @param {String} roomName - the room the field is attached to.
     * @param {String} fieldName - the name of the field.
     * @param {Object} fieldValue - the value of the field.
     * @example
     *   easyrtc.setRoomApiField("trekkieRoom",  "favorite_alien", "Mr Spock");
     *   easyrtc.setRoomOccupantListener( function(roomName, list){
     *      for( var i in list ){
     *         console.log("easyrtcid=" + i + " favorite alien is " + list[i].apiFields.favorite_alien);
     *      }
     *   });
     */
    this.setRoomApiField = function(roomName, fieldName, fieldValue) {
        //
        // if we're not connected yet, we'll just cache the fields until we are.
        //
        if (!self._roomApiFields) {
            self._roomApiFields = {};
        }
        if (!fieldName && !fieldValue) {
            delete self._roomApiFields[roomName];
            return;
        }

        if (!self._roomApiFields[roomName]) {
            self._roomApiFields[roomName] = {};
        }
        if (fieldValue !== undefined && fieldValue !== null) {
            if (typeof fieldValue === "object") {
                try {
                    JSON.stringify(fieldValue);
                }
                catch (jsonError) {
                    self.showError(self.errCodes.DEVELOPER_ERR, "easyrtc.setRoomApiField passed bad object ");
                    return;
                }
            }
            self._roomApiFields[roomName][fieldName] = {fieldName: fieldName, fieldValue: fieldValue};
        }
        else {
            delete self._roomApiFields[roomName][fieldName];
        }
        if (self.webSocketConnected) {
            enqueueSendRoomApi(roomName);
        }
    };

    /**
     * Default error reporting function. The default implementation displays error messages
     * in a programmatically created div with the id easyrtcErrorDialog. The div has title
     * component with a class name of easyrtcErrorDialog_title. The error messages get added to a
     * container with the id easyrtcErrorDialog_body. Each error message is a text node inside a div
     * with a class of easyrtcErrorDialog_element. There is an "okay" button with the className of easyrtcErrorDialog_okayButton.
     * @param {String} messageCode An error message code
     * @param {String} message the error message text without any markup.
     * @example
     *     easyrtc.showError("BAD_NAME", "Invalid username");
     */
    this.showError = function(messageCode, message) {
        self.onError({errorCode: messageCode, errorText: message});
    };

    /**
     * @private
     * @param errorObject
     */
    this.onError = function(errorObject) {
        logDebug("saw error " + errorObject.errorText);

        var errorDiv = document.getElementById('easyrtcErrorDialog');
        var errorBody;
        if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.id = 'easyrtcErrorDialog';
            var title = document.createElement("div");
            title.innerHTML = "Error messages";
            title.className = "easyrtcErrorDialog_title";
            errorDiv.appendChild(title);
            errorBody = document.createElement("div");
            errorBody.id = "easyrtcErrorDialog_body";
            errorDiv.appendChild(errorBody);
            var clearButton = document.createElement("button");
            clearButton.appendChild(document.createTextNode("Okay"));
            clearButton.className = "easyrtcErrorDialog_okayButton";
            clearButton.onclick = function() {
                errorBody.innerHTML = ""; // remove all inner nodes
                errorDiv.style.display = "none";
            };
            errorDiv.appendChild(clearButton);
            document.body.appendChild(errorDiv);
        }

        errorBody = document.getElementById("easyrtcErrorDialog_body");
        var messageNode = document.createElement("div");
        messageNode.className = 'easyrtcErrorDialog_element';
        messageNode.appendChild(document.createTextNode(errorObject.errorText));
        errorBody.appendChild(messageNode);
        errorDiv.style.display = "block";
    };

    /** @private
     * @param mediaStream */
    //
    // easyrtc.createObjectURL builds a URL from a media stream.
    // Arguments:
    //     mediaStream - a media stream object.
    // The video object in Chrome expects a URL.
    //
    this.createObjectURL = function(mediaStream) {
        var errMessage;
        if (window.URL && window.URL.createObjectURL) {
            return window.URL.createObjectURL(mediaStream);
        }
        else if (window.webkitURL && window.webkitURL.createObjectURL) {
            return window.webkit.createObjectURL(mediaStream);
        }
        else {
            errMessage = "Your browsers does not support URL.createObjectURL.";
            logDebug("saw exception " + errMessage);
            throw errMessage;
        }
    };

    /**
     * A convenience function to ensure that a string doesn't have symbols that will be interpreted by HTML.
     * @param {String} idString
     * @return {String} The cleaned string.
     * @example
     *   console.log( easyrtc.cleanId('&hello'));
     */
    this.cleanId = function(idString) {
        var MAP = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };
        return idString.replace(/[&<>]/g, function(c) {
            return MAP[c];
        });
    };

    /**
     * Set a callback that will be invoked when the application enters or leaves a room.
     * @param {Function} handler - the first parameter is true for entering a room, false for leaving a room. The second parameter is the room name.
     * @example
     *   easyrtc.setRoomEntryListener(function(entry, roomName){
     *       if( entry ){
     *           console.log("entering room " + roomName);
     *       }
     *       else{
     *           console.log("leaving room " + roomName);
     *       }
     *   });
     */
    self.setRoomEntryListener = function(handler) {
        self.roomEntryListener = handler;
    };

    /**
     * Set the callback that will be invoked when the list of people logged in changes.
     * The callback expects to receive a room name argument, and
     * a map whose ideas are easyrtcids and whose values are in turn maps
     * supplying user specific information. The inner maps have the following keys:
     * username, applicationName, browserFamily, browserMajor, osFamily, osMajor, deviceFamily.
     * The third argument is the listener is the innerMap for the connections own data (not needed by most applications).
     * @param {Function} listener
     * @example
     *   easyrtc.setRoomOccupantListener( function(roomName, list, selfInfo){
     *      for( var i in list ){
     *         ("easyrtcid=" + i + " belongs to user " + list[i].username);
     *      }
     *   });
     */
    self.setRoomOccupantListener = function(listener) {
        roomOccupantListener = listener;
    };

    /**
     * Sets a callback that is called when a data channel is open and ready to send data.
     * The callback will be called with an easyrtcid as it's sole argument.
     * @param {Function} listener
     * @example
     *    easyrtc.setDataChannelOpenListener( function(easyrtcid){
     *         easyrtc.sendDataP2P(easyrtcid, "greeting", "hello");
     *    });
     */
    this.setDataChannelOpenListener = function(listener) {
        onDataChannelOpen = listener;
    };

    /** Sets a callback that is called when a previously open data channel closes.
     * The callback will be called with an easyrtcid as it's sole argument.
     * @param {Function} listener
     * @example
     *    easyrtc.setDataChannelCloseListener( function(easyrtcid){
     *            ("No longer connected to " + easyrtc.idToName(easyrtcid));
     *    });
     */
    this.setDataChannelCloseListener = function(listener) {
        onDataChannelClose = listener;
    };

    /** Returns the number of live peer connections the client has.
     * @return {Number}
     * @example
     *    ("You have " + easyrtc.getConnectionCount() + " peer connections");
     */
    this.getConnectionCount = function() {
        var count = 0;
        var i;
        for (i in peerConns) {
            if (peerConns.hasOwnProperty(i)) {
                if (self.getConnectStatus(i) === self.IS_CONNECTED) {
                    count++;
                }
            }
        }
        return count;
    };

    /** Sets the maximum length in bytes of P2P messages that can be sent.
     * @param {Number} maxLength maximum length to set
     * @example
     *     easyrtc.setMaxP2PMessageLength(10000);
     */
    this.setMaxP2PMessageLength = function(maxLength) {
        this.maxP2PMessageLength = maxLength;
    };

    /** Sets whether audio is transmitted by the local user in any subsequent calls.
     * @param {Boolean} enabled true to include audio, false to exclude audio. The default is true.
     * @example
     *      easyrtc.enableAudio(false);
     */
    this.enableAudio = function(enabled) {
        self.audioEnabled = enabled;
    };

    /**
     *Sets whether video is transmitted by the local user in any subsequent calls.
     * @param {Boolean} enabled - true to include video, false to exclude video. The default is true.
     * @example
     *      easyrtc.enableVideo(false);
     */
    this.enableVideo = function(enabled) {
        self.videoEnabled = enabled;
    };

    /**
     * Sets whether WebRTC data channels are used to send inter-client messages.
     * This is only the messages that applications explicitly send to other applications, not the WebRTC signaling messages.
     * @param {Boolean} enabled  true to use data channels, false otherwise. The default is false.
     * @example
     *     easyrtc.enableDataChannels(true);
     */
    this.enableDataChannels = function(enabled) {
        dataEnabled = enabled;
    };

    /**
     * @private
     * @param {Boolean} enable
     * @param {Array} tracks - an array of MediaStreamTrack
     */
    function enableMediaTracks(enable, tracks) {
        var i;
        if (tracks) {
            for (i = 0; i < tracks.length; i++) {
                var track = tracks[i];
                track.enabled = enable;
            }
        }
    }

    /** @private */
    //
    // fetches a stream by name. Treat a null/undefined streamName as "default".
    //
    function getLocalMediaStreamByName(streamName) {
        if (!streamName) {
            streamName = "default";
        }
        if (namedLocalMediaStreams.hasOwnProperty(streamName)) {
            return namedLocalMediaStreams[streamName];
        }
        else {
            return null;
        }
    }

    /**
     * Returns the user assigned id's of currently active local media streams.
     * @return {Array}
     */
    this.getLocalMediaIds = function() {
        return Object.keys(namedLocalMediaStreams);
    };

    /** @private */
    function buildMediaIds() {
        var mediaMap = {};
        var streamName;
        for (streamName in namedLocalMediaStreams) {
            if (namedLocalMediaStreams.hasOwnProperty(streamName)) {
                mediaMap[streamName] = namedLocalMediaStreams[streamName].id || "default";
            }
        }
        return mediaMap;
    }

    /** @private */
    function registerLocalMediaStreamByName(stream, streamName) {
        var roomName;
        if (!streamName) {
            streamName = "default";
        }
        stream.streamName = streamName;
        namedLocalMediaStreams[streamName] = stream;
        if (streamName !== "default") {
            var mediaIds = buildMediaIds(),
                roomData = self.roomData;
            for (roomName in roomData) {
                if (roomData.hasOwnProperty(roomName)) {
                    self.setRoomApiField(roomName, "mediaIds", mediaIds);
                }
            }
        }
    }

    /**
     * Allow an externally created mediastream (ie, created by another
     * library) to be used within easyrtc. Tracking when it closes
     * must be done by the supplying party.
     */
    this.register3rdPartyLocalMediaStream = function(stream, streamName) {
       return registerLocalMediaStreamByName(stream, streamName);
    };

    /** @private */
    //
    // look up a stream's name from the stream.id
    //
    function getNameOfRemoteStream(easyrtcId, webrtcStreamId) {
        var roomName;
        var mediaIds;
        var streamName;
        if (!webrtcStreamId) {
            webrtcStreamId = "default";
        }
        if (peerConns[easyrtcId]) {
            streamName = peerConns[easyrtcId].remoteStreamIdToName[webrtcStreamId];
            if (streamName) {
                return streamName;
            }
        }

        for (roomName in self.roomData) {
            if (self.roomData.hasOwnProperty(roomName)) {
                mediaIds = self.getRoomApiField(roomName, easyrtcId, "mediaIds");
                if (!mediaIds) {
                    continue;
                }
                for (streamName in mediaIds) {
                    if (mediaIds.hasOwnProperty(streamName) &&
                            mediaIds[streamName] === webrtcStreamId) {
                        return streamName;
                    }
                }
                //
                // a stream from chrome to firefox will be missing it's id/label.
                // there is no correct solution.
                //
                if (
                    adapter && adapter.browserDetails &&
                        adapter.browserDetails.browser === "firefox"
                ) {

                   // if there is a stream called default, return it in preference
                   if (mediaIds["default"]) {
                       return "default";
                   }

                   //
                   // otherwise return the first name we find. If there is more than
                   // one, complain to Mozilla.
                   //
                   for(var anyName in mediaIds) {
                        if (mediaIds.hasOwnProperty(anyName)) {
                            return anyName;
                        }
                   }
                }
            }
        }

        return undefined;
    }

    this.getNameOfRemoteStream = function(easyrtcId, webrtcStream){
        if(typeof webrtcStream === "string") {
            return getNameOfRemoteStream(easyrtcId, webrtcStream);
        }
        else if( webrtcStream.id) {
            return getNameOfRemoteStream(easyrtcId, webrtcStream.id);
        }
    };

    /** @private */
    function closeLocalMediaStreamByName(streamName) {
        if (!streamName) {
            streamName = "default";
        }
        var stream = self.getLocalStream(streamName);
        if (!stream) {
            return;
        }
        var streamId = stream.id || "default";
        var id;
        var roomName;
        if (namedLocalMediaStreams[streamName]) {

            for (id in peerConns) {
                if (peerConns.hasOwnProperty(id)) {
                    try {
                        peerConns[id].pc.removeStream(stream);
                    } catch (err) {
                    }
                    self.sendPeerMessage(id, "__closingMediaStream", {streamId: streamId, streamName: streamName});
                }
            }

            stopStream(namedLocalMediaStreams[streamName]);
            delete namedLocalMediaStreams[streamName];

            if (streamName !== "default") {
                var mediaIds = buildMediaIds();
                for (roomName in self.roomData) {
                    if (self.roomData.hasOwnProperty(roomName)) {
                        self.setRoomApiField(roomName, "mediaIds", mediaIds);
                    }
                }
            }
        }
    }

    /**
     * Close the local media stream. You usually need to close the existing media stream
     * of a camera before reacquiring it at a different resolution.
     * @param {String} streamName - an option stream name.
     */
    this.closeLocalMediaStream = function(streamName) {
        return closeLocalMediaStreamByName(streamName);
    };

    /**
     * Alias for closeLocalMediaStream
     */
    this.closeLocalStream = this.closeLocalMediaStream;

    /**
     * This function is used to enable and disable the local camera. If you disable the
     * camera, video objects display it will "freeze" until the camera is re-enabled. *
     * By default, a camera is enabled.
     * @param {Boolean} enable - true to enable the camera, false to disable it.
     * @param {String} streamName - the name of the stream, optional.
     */
    this.enableCamera = function(enable, streamName) {
        var stream = getLocalMediaStreamByName(streamName);
        if (stream && stream.getVideoTracks) {
            enableMediaTracks(enable, stream.getVideoTracks());
        }
    };

    /**
     * This function is used to enable and disable the local microphone. If you disable
     * the microphone, sounds stops being transmitted to your peers. By default, the microphone
     * is enabled.
     * @param {Boolean} enable - true to enable the microphone, false to disable it.
     * @param {String} streamName - an optional streamName
     */
    this.enableMicrophone = function(enable, streamName) {
        var stream = getLocalMediaStreamByName(streamName);
        if (stream && stream.getAudioTracks) {
            enableMediaTracks(enable, stream.getAudioTracks());
        }
    };

    /**
     * Mute a video object.
     * @param {String} videoObjectName - A DOMObject or the id of the DOMObject.
     * @param {Boolean} mute - true to mute the video object, false to unmute it.
     */
    this.muteVideoObject = function(videoObjectName, mute) {
        var videoObject;
        if (typeof (videoObjectName) === 'string') {
            videoObject = document.getElementById(videoObjectName);
            if (!videoObject) {
                throw "Unknown video object " + videoObjectName;
            }
        }
        else if (!videoObjectName) {
            throw "muteVideoObject passed a null";
        }
        else {
            videoObject = videoObjectName;
        }
        videoObject.muted = !!mute;
    };

    /**
     * Returns a URL for your local camera and microphone.
     *  It can be called only after easyrtc.initMediaSource has succeeded.
     *  It returns a url that can be used as a source by the Chrome video element or the &lt;canvas&gt; element.
     *  @param {String} streamName - an option stream name.
     *  @return {URL}
     *  @example
     *      document.getElementById("myVideo").src = easyrtc.getLocalStreamAsUrl();
     */
    self.getLocalStreamAsUrl = function(streamName) {
        var stream = getLocalMediaStreamByName(streamName);
        if (stream === null) {
            throw "Developer error: attempt to get a MediaStream without invoking easyrtc.initMediaSource successfully";
        }
        return self.createObjectURL(stream);
    };

    /**
     * Returns a media stream for your local camera and microphone.
     *  It can be called only after easyrtc.initMediaSource has succeeded.
     *  It returns a stream that can be used as an argument to easyrtc.setVideoObjectSrc.
     *  Returns null if there is no local media stream acquired yet.
     * @return {?MediaStream}
     * @example
     *    easyrtc.setVideoObjectSrc( document.getElementById("myVideo"), easyrtc.getLocalStream());
     */
    this.getLocalStream = function(streamName) {
        return getLocalMediaStreamByName(streamName) || null;
    };

    /** Clears the media stream on a video object.
     *
     * @param {Object} element the video object.
     * @example
     *    easyrtc.clearMediaStream( document.getElementById('selfVideo'));
     *
     */
    this.clearMediaStream = function(element) {
        if (typeof element.src !== 'undefined') {
            //noinspection JSUndefinedPropertyAssignment
            element.src = "";
        } else if (typeof element.srcObject !== 'undefined') {
            element.srcObject = "";
        } else if (typeof element.mozSrcObject !== 'undefined') {
            element.mozSrcObject = null;
        }
    };

    /**
     *  Sets a video or audio object from a media stream.
     *  Chrome uses the src attribute and expects a URL, while firefox
     *  uses the mozSrcObject and expects a stream. This procedure hides
     *  that from you.
     *  If the media stream is from a local webcam, you may want to add the
     *  easyrtcMirror class to the video object so it looks like a proper mirror.
     *  The easyrtcMirror class is defined in this.css.
     *  Which is could be added using the same path of easyrtc.js file to an HTML file
     *  @param {Object} element an HTML5 video element
     *  @param {MediaStream|String} stream a media stream as returned by easyrtc.getLocalStream or your stream acceptor.
     * @example
     *    easyrtc.setVideoObjectSrc( document.getElementById("myVideo"), easyrtc.getLocalStream());
     *
     */
    this.setVideoObjectSrc = function(element, stream) {
        if (stream && stream !== "") {
            element.autoplay = true;

            if (typeof element.src !== 'undefined') {
                element.src = self.createObjectURL(stream);
            } else if (typeof element.srcObject !== 'undefined') {
                element.srcObject = stream;
            } else if (typeof element.mozSrcObject !== 'undefined') {
                element.mozSrcObject = self.createObjectURL(stream);
            }
            element.play();
        }
        else {
            self.clearMediaStream(element);
        }
    };

    /**
     * This function builds a new named local media stream from a set of existing audio and video tracks from other media streams.
     * @param {String} streamName is the name of the new media stream.
     * @param {Array} audioTracks is an array of MediaStreamTracks
     * @param {Array} videoTracks is an array of MediaStreamTracks
     * @returns {?MediaStream} the track created.
     * @example
     *    easyrtc.buildLocalMediaStream("myComposedStream",
     *             easyrtc.getLocalStream("camera1").getVideoTracks(),
     *             easyrtc.getLocalStream("camera2").getAudioTracks());
     */
    this.buildLocalMediaStream = function(streamName, audioTracks, videoTracks) {
        var i;
        if (typeof streamName !== 'string') {
            self.showError(self.errCodes.DEVELOPER_ERR,
               "easyrtc.buildLocalMediaStream not supplied a stream name");
            return null;
        }

         var streamToClone = null;
         for(var key in namedLocalMediaStreams ) {
            if( namedLocalMediaStreams.hasOwnProperty(key)) {
              streamToClone = namedLocalMediaStreams[key];
              if(streamToClone) {
                break;
              }
            }
         }
         if( !streamToClone ) {
            for(key in peerConns) {
                if (peerConns.hasOwnProperty(key)) {
                    var remoteStreams = peerConns[key].pc.getRemoteStreams();
                    if( remoteStreams && remoteStreams.length > 0 ) {
                        streamToClone = remoteStreams[0];
                    }
                }
            }
         }
         if( !streamToClone ){
            self.showError(self.errCodes.DEVELOPER_ERR,
             "Attempt to create a mediastream without one to clone from");
            return null;
         }

         //
         // clone whatever mediastream we found, and remove any of it's
         // tracks.
         //
         var mediaClone = streamToClone.clone();
         var oldTracks = mediaClone.getTracks();

        if (audioTracks) {
            for (i = 0; i < audioTracks.length; i++) {
                mediaClone.addTrack(audioTracks[i].clone());
            }
        }

        if (videoTracks) {
            for (i = 0; i < videoTracks.length; i++) {
                mediaClone.addTrack(videoTracks[i].clone());
            }
        }

        for( i = 0; i < oldTracks.length; i++ ) {
            mediaClone.removeTrack(oldTracks[i]);
        }

        registerLocalMediaStreamByName(mediaClone, streamName);
        return mediaClone;
    };

    /* @private*/
    /** Load Easyrtc Stylesheet.
     *   Easyrtc Stylesheet define easyrtcMirror class and some basic css class for using easyrtc.js.
     *   That way, developers can override it or use it's own css file minified css or package.
     * @example
     *       easyrtc.loadStylesheet();
     *
     */
    this.loadStylesheet = function() {

        //
        // check to see if we already have an easyrtc.css file loaded
        // if we do, we can exit immediately.
        //
        var links = document.getElementsByTagName("link");
        var cssIndex, css;
        for (cssIndex in links) {
            if (links.hasOwnProperty(cssIndex)) {
                css = links[cssIndex];
                if (css.href && (css.href.match(/\/easyrtc.css/))) {
                    return;
                }
            }
        }
        //
        // add the easyrtc.css file since it isn't present
        //
        var easySheet = document.createElement("link");
        easySheet.setAttribute("rel", "stylesheet");
        easySheet.setAttribute("type", "text/css");
        easySheet.setAttribute("href", "/easyrtc/easyrtc.css");
        var headSection = document.getElementsByTagName("head")[0];
        var firstHead = headSection.childNodes[0];
        headSection.insertBefore(easySheet, firstHead);
    };

    /**
     * @private
     * @param {String} x
     */
    this.formatError = function(x) {
        var name, result;
        if (x === null || typeof x === 'undefined') {
            return "null";
        }
        if (typeof x === 'string') {
            return x;
        }
        else if (x.type && x.description) {
            return x.type + " : " + x.description;
        }
        else if (typeof x === 'object') {
            try {
                return JSON.stringify(x);
            }
            catch (oops) {
                result = "{";
                for (name in x) {
                    if (x.hasOwnProperty(name)) {
                        if (typeof x[name] === 'string') {
                            result = result + name + "='" + x[name] + "' ";
                        }
                    }
                }
                result = result + "}";
                return result;
            }
        }
        else {
            return "Strange case";
        }
    };

    /**
     * Initializes your access to a local camera and microphone.
     * Failure could be caused a browser that didn't support WebRTC, or by the user not granting permission.
     * If you are going to call easyrtc.enableAudio or easyrtc.enableVideo, you need to do it before
     * calling easyrtc.initMediaSource.
     * @param {function(Object)} successCallback - will be called with localmedia stream on success.
     * @param {function(String,String)} errorCallback - is called with an error code and error description.
     * @param {String} streamName - an optional name for the media source so you can use multiple cameras and
     * screen share simultaneously.
     * @example
     *       easyrtc.initMediaSource(
     *          function(mediastream){
     *              easyrtc.setVideoObjectSrc( document.getElementById("mirrorVideo"), mediastream);
     *          },
     *          function(errorCode, errorText){
     *               easyrtc.showError(errorCode, errorText);
     *          });
     */
    this.initMediaSource = function(successCallback, errorCallback, streamName) {

        logDebug("about to request local media");

        if (!streamName) {
            streamName = "default";
        }

        haveAudioVideo = {
            audio: self.audioEnabled,
            video: self.videoEnabled
        };

        if (!errorCallback) {
            errorCallback = function(errorCode, errorText) {
                var message = "easyrtc.initMediaSource: " + self.formatError(errorText);
                logDebug(message);
                self.showError(self.errCodes.MEDIA_ERR, message);
            };
        }

        if (!self.supportsGetUserMedia()) {
            errorCallback(self.errCodes.MEDIA_ERR, self.getConstantString("noWebrtcSupport"));
            return;
        }

        if (!successCallback) {
            self.showError(self.errCodes.DEVELOPER_ERR,
                    "easyrtc.initMediaSource not supplied a successCallback");
            return;
        }

        var mode = self.getUserMediaConstraints();
        /** @private
         * @param {Object} stream - A mediaStream object.
         *  */
        var onUserMediaSuccess = function(stream) {
            logDebug("getUserMedia success callback entered");
            logDebug("successfully got local media");

            stream.streamName = streamName;
            registerLocalMediaStreamByName(stream, streamName);
            var videoObj, triesLeft, tryToGetSize, ele;
            if (haveAudioVideo.video) {
                videoObj = document.createElement('video');
                videoObj.muted = true;
                triesLeft = 30;
                tryToGetSize = function() {
                    if (videoObj.videoWidth > 0 || triesLeft < 0) {
                        self.nativeVideoWidth = videoObj.videoWidth;
                        self.nativeVideoHeight = videoObj.videoHeight;
                        if (self._desiredVideoProperties.height &&
                                (self.nativeVideoHeight !== self._desiredVideoProperties.height ||
                                        self.nativeVideoWidth !== self._desiredVideoProperties.width)) {
                            self.showError(self.errCodes.MEDIA_WARNING,
                                    self.format(self.getConstantString("resolutionWarning"),
                                    self._desiredVideoProperties.width, self._desiredVideoProperties.height,
                                    self.nativeVideoWidth, self.nativeVideoHeight));
                        }
                        self.setVideoObjectSrc(videoObj, null);
                        if (videoObj.removeNode) {
                            videoObj.removeNode(true);
                        }
                        else {
                            ele = document.createElement('div');
                            ele.appendChild(videoObj);
                            ele.removeChild(videoObj);
                        }

                        updateConfigurationInfo();
                        if (successCallback) {
                            successCallback(stream);
                        }
                    }
                    else {
                        triesLeft -= 1;
                        setTimeout(tryToGetSize, 300);
                    }
                };
                self.setVideoObjectSrc(videoObj, stream);
                tryToGetSize();
            }
            else {
                updateConfigurationInfo();
                if (successCallback) {
                    successCallback(stream);
                }
            }
        };

        /**
         * @private
         * @param {String} error
         */
        var onUserMediaError = function(error) {
            logDebug("getusermedia failed");
            logDebug("failed to get local media");
            var errText;
            if (typeof error === 'string') {
                errText = error;
            }
            else if (error.name) {
                errText = error.name;
            }
            else {
                errText = "Unknown";
            }
            if (errorCallback) {
                logDebug("invoking error callback", errText);
                errorCallback(self.errCodes.MEDIA_ERR, self.format(self.getConstantString("gumFailed"), errText));
            }
            closeLocalMediaStreamByName(streamName);
            haveAudioVideo = {
                audio: false,
                video: false
            };
            updateConfigurationInfo();
        };

        if (!self.audioEnabled && !self.videoEnabled) {
            onUserMediaError(self.getConstantString("requireAudioOrVideo"));
            return;
        }

        function getCurrentTime() {
            return (new Date()).getTime();
        }

        var firstCallTime;
        function tryAgain(err) {
            var currentTime = getCurrentTime();
            if (currentTime < firstCallTime + 1000) {
                logDebug("Trying getUserMedia a second time");
                try {
                    navigator.getUserMedia(mode, onUserMediaSuccess, onUserMediaError);
                } catch (e) {
                    onUserMediaError(err);
                }
            }
            else {
                onUserMediaError(err);
            }
        }

        //
        // getUserMedia sometimes fails the first time I call it. I suspect it's a page loading
        // issue. So I'm going to try adding a 1 second delay to allow things to settle down first.
        // In addition, I'm going to try again after 3 seconds.
        //
        try {
            firstCallTime = getCurrentTime();
            navigator.getUserMedia(mode, onUserMediaSuccess, tryAgain);
        } catch (err) {
            tryAgain(err);
        }
    };

    /**
     * Sets the callback used to decide whether to accept or reject an incoming call.
     * @param {Function} acceptCheck takes the arguments (callerEasyrtcid, acceptor).
     * The acceptCheck callback is passed an easyrtcid and an acceptor function. The acceptor function should be called with either
     * a true value (accept the call) or false value( reject the call) as it's first argument, and optionally,
     * an array of local media streamNames as a second argument.
     * @example
     *      easyrtc.setAcceptChecker( function(easyrtcid, acceptor){
     *           if( easyrtc.idToName(easyrtcid) === 'Fred' ){
     *              acceptor(true);
     *           }
     *           else if( easyrtc.idToName(easyrtcid) === 'Barney' ){
     *              setTimeout( function(){
     acceptor(true, ['myOtherCam']); // myOtherCam presumed to a streamName
     }, 10000);
     *           }
     *           else{
     *              acceptor(false);
     *           }
     *      });
     */
    this.setAcceptChecker = function(acceptCheck) {
        self.acceptCheck = acceptCheck;
    };

    /**
     * easyrtc.setStreamAcceptor sets a callback to receive media streams from other peers, independent
     * of where the call was initiated (caller or callee).
     * @param {Function} acceptor takes arguments (caller, mediaStream, mediaStreamName)
     * @example
     *  easyrtc.setStreamAcceptor(function(easyrtcid, stream, streamName){
     *     document.getElementById('callerName').innerHTML = easyrtc.idToName(easyrtcid);
     *     easyrtc.setVideoObjectSrc( document.getElementById("callerVideo"), stream);
     *  });
     */
    this.setStreamAcceptor = function(acceptor) {
        self.streamAcceptor = acceptor;
    };

    /** Sets the easyrtc.onError field to a user specified function.
     * @param {Function} errListener takes an object of the form {errorCode: String, errorText: String}
     * @example
     *    easyrtc.setOnError( function(errorObject){
     *        document.getElementById("errMessageDiv").innerHTML += errorObject.errorText;
     *    });
     */
    self.setOnError = function(errListener) {
        self.onError = errListener;
    };

    /**
     * Sets the callCancelled callback. This will be called when a remote user
     * initiates a call to you, but does a "hangup" before you have a chance to get his video stream.
     * @param {Function} callCancelled takes an easyrtcid as an argument and a boolean that indicates whether
     *  the call was explicitly cancelled remotely (true), or actually accepted by the user attempting a call to
     *  the same party.
     * @example
     *     easyrtc.setCallCancelled( function(easyrtcid, explicitlyCancelled){
     *        if( explicitlyCancelled ){
     *            console.log(easyrtc.idToName(easyrtcid) + " stopped trying to reach you");
     *         }
     *         else{
     *            console.log("Implicitly called "  + easyrtc.idToName(easyrtcid));
     *         }
     *     });
     */
    this.setCallCancelled = function(callCancelled) {
        self.callCancelled = callCancelled;
    };

    /**  Sets a callback to receive notification of a media stream closing. The usual
     *  use of this is to clear the source of your video object so you aren't left with
     *  the last frame of the video displayed on it.
     *  @param {Function} onStreamClosed takes an easyrtcid as it's first parameter, the stream as it's second argument, and name of the video stream as it's third.
     *  @example
     *     easyrtc.setOnStreamClosed( function(easyrtcid, stream, streamName){
     *         easyrtc.setVideoObjectSrc( document.getElementById("callerVideo"), "");
     *         ( easyrtc.idToName(easyrtcid) + " closed stream " + stream.id + " " + streamName);
     *     });
     */
    this.setOnStreamClosed = function(onStreamClosed) {
        self.onStreamClosed = onStreamClosed;
    };

    /**
     * Sets a listener for data sent from another client (either peer to peer or via websockets).
     * If no msgType or source is provided, the listener applies to all events that aren't otherwise handled.
     * If a msgType but no source is provided, the listener applies to all messages of that msgType that aren't otherwise handled.
     * If a msgType and a source is provided, the listener applies to only message of the specified type coming from the specified peer.
     * The most specific case takes priority over the more general.
     * @param {Function} listener has the signature (easyrtcid, msgType, msgData, targeting).
     *   msgType is a string. targeting is null if the message was received using WebRTC data channels, otherwise it
     *   is an object that contains one or more of the following string valued elements {targetEasyrtcid, targetGroup, targetRoom}.
     * @param {String} msgType - a string, optional.
     * @param {String} source - the sender's easyrtcid, optional.
     * @example
     *     easyrtc.setPeerListener( function(easyrtcid, msgType, msgData, targeting){
     *         console.log("From " + easyrtc.idToName(easyrtcid) +
     *             " sent the following data " + JSON.stringify(msgData));
     *     });
     *     easyrtc.setPeerListener( function(easyrtcid, msgType, msgData, targeting){
     *         console.log("From " + easyrtc.idToName(easyrtcid) +
     *             " sent the following data " + JSON.stringify(msgData));
     *     }, 'food', 'dkdjdekj44--');
     *     easyrtc.setPeerListener( function(easyrtcid, msgType, msgData, targeting){
     *         console.log("From " + easyrtcid +
     *             " sent the following data " + JSON.stringify(msgData));
     *     }, 'drink');
     *
     *
     */
    this.setPeerListener = function(listener, msgType, source) {
        if (!msgType) {
            receivePeer.cb = listener;
        }
        else {
            if (!receivePeer.msgTypes[msgType]) {
                receivePeer.msgTypes[msgType] = {sources: {}};
            }
            if (!source) {
                receivePeer.msgTypes[msgType].cb = listener;
            }
            else {
                receivePeer.msgTypes[msgType].sources[source] = {cb: listener};
            }
        }
    };
    /* This function serves to distribute peer messages to the various peer listeners */
    /** @private
     * @param {String} easyrtcid
     * @param {Object} msg - needs to contain a msgType and a msgData field.
     * @param {Object} targeting
     */
    this.receivePeerDistribute = function(easyrtcid, msg, targeting) {
        var msgType = msg.msgType;
        var msgData = msg.msgData;
        if (!msgType) {
            logDebug("received peer message without msgType", msg);
            return;
        }

        if (receivePeer.msgTypes[msgType]) {
            if (receivePeer.msgTypes[msgType].sources[easyrtcid] &&
                    receivePeer.msgTypes[msgType].sources[easyrtcid].cb) {
                receivePeer.msgTypes[msgType].sources[easyrtcid].cb(easyrtcid, msgType, msgData, targeting);
                return;
            }
            if (receivePeer.msgTypes[msgType].cb) {
                receivePeer.msgTypes[msgType].cb(easyrtcid, msgType, msgData, targeting);
                return;
            }
        }
        if (receivePeer.cb) {
            receivePeer.cb(easyrtcid, msgType, msgData, targeting);
        }
    };

    /**
     * Sets a listener for messages from the server.
     * @param {Function} listener has the signature (msgType, msgData, targeting)
     * @example
     *     easyrtc.setServerListener( function(msgType, msgData, targeting){
     *         ("The Server sent the following message " + JSON.stringify(msgData));
     *     });
     */
    this.setServerListener = function(listener) {
        receiveServerCB = listener;
    };

    /**
     * Sets the url of the Socket server.
     * The node.js server is great as a socket server, but it doesn't have
     * all the hooks you'd like in a general web server, like PHP or Python
     * plug-ins. By setting the serverPath your application can get it's regular
     * pages from a regular web server, but the EasyRTC library can still reach the
     * socket server.
     * @param {String} socketUrl
     * @param {Object} options an optional dictionary of options for socket.io's connect method.
     * The default is {'connect timeout': 10000,'force new connection': true }
     * @example
     *     easyrtc.setSocketUrl(":8080", options);
     */
    this.setSocketUrl = function(socketUrl, options) {
        logDebug("WebRTC signaling server URL set to " + socketUrl);
        serverPath = socketUrl;
        if( options ) {
            connectionOptions = options;
        }
    };

    /**
     * Sets the user name associated with the connection.
     * @param {String} username must obey standard identifier conventions.
     * @returns {Boolean} true if the call succeeded, false if the username was invalid.
     * @example
     *    if( !easyrtc.setUsername("JohnSmith") ){
     *        console.error("bad user name);
     *    }
     *
     */
    this.setUsername = function(username) {
        if( self.myEasyrtcid ) {
            self.showError(self.errCodes.DEVELOPER_ERR, "easyrtc.setUsername called after authentication");
            return false;
        }
        else if (self.isNameValid(username)) {
            self.username = username;
            return true;
        }
        else {
            self.showError(self.errCodes.BAD_NAME, self.format(self.getConstantString("badUserName"), username));
            return false;
        }
    };

    /**
     * Get an array of easyrtcids that are using a particular username
     * @param {String} username - the username of interest.
     * @param {String} room - an optional room name argument limiting results to a particular room.
     * @returns {Array} an array of {easyrtcid:id, roomName: roomName}.
     */
    this.usernameToIds = function(username, room) {
        var results = [];
        var id, roomName;
        for (roomName in lastLoggedInList) {
            if (!lastLoggedInList.hasOwnProperty(roomName)) {
                continue;
            }
            if (room && roomName !== room) {
                continue;
            }
            for (id in lastLoggedInList[roomName]) {
                if (!lastLoggedInList[roomName].hasOwnProperty(id)) {
                    continue;
                }
                if (lastLoggedInList[roomName][id].username === username) {
                    results.push({
                        easyrtcid: id,
                        roomName: roomName
                    });
                }
            }
        }
        return results;
    };

    /**
     * Returns another peers API field, if it exists.
     * @param {type} roomName
     * @param {type} easyrtcid
     * @param {type} fieldName
     * @returns {Object}  Undefined if the attribute does not exist, its value otherwise.
     */
    this.getRoomApiField = function(roomName, easyrtcid, fieldName) {
        if (lastLoggedInList[roomName] &&
                lastLoggedInList[roomName][easyrtcid] &&
                lastLoggedInList[roomName][easyrtcid].apiField &&
                lastLoggedInList[roomName][easyrtcid].apiField[fieldName]) {
            return lastLoggedInList[roomName][easyrtcid].apiField[fieldName].fieldValue;
        }
        else {
            return undefined;
        }
    };

    /**
     * Set the authentication credential if needed.
     * @param {Object} credentialParm - a JSONable object.
     */
    this.setCredential = function(credentialParm) {
        try {
            JSON.stringify(credentialParm);
            credential = credentialParm;
            return true;
        }
        catch (oops) {
            self.showError(self.errCodes.BAD_CREDENTIAL, "easyrtc.setCredential passed a non-JSON-able object");
            throw "easyrtc.setCredential passed a non-JSON-able object";
        }
    };

    /**
     * Sets the listener for socket disconnection by external (to the API) reasons.
     * @param {Function} disconnectListener takes no arguments and is not called as a result of calling easyrtc.disconnect.
     * @example
     *    easyrtc.setDisconnectListener(function(){
     *        easyrtc.showError("SYSTEM-ERROR", "Lost our connection to the socket server");
     *    });
     */
    this.setDisconnectListener = function(disconnectListener) {
        self.disconnectListener = disconnectListener;
    };

    /**
     * Convert an easyrtcid to a user name. This is useful for labeling buttons and messages
     * regarding peers.
     * @param {String} easyrtcid
     * @return {String} the username associated with the easyrtcid, or the easyrtcid if there is
     * no associated username.
     * @example
     *    console.log(easyrtcid + " is actually " + easyrtc.idToName(easyrtcid));
     */
    this.idToName = function(easyrtcid) {
        var roomName;
        for (roomName in lastLoggedInList) {
            if (!lastLoggedInList.hasOwnProperty(roomName)) {
                continue;
            }
            if (lastLoggedInList[roomName][easyrtcid]) {
                if (lastLoggedInList[roomName][easyrtcid].username) {
                    return lastLoggedInList[roomName][easyrtcid].username;
                }
            }
        }
        return easyrtcid;
    };

    /* used in easyrtc.connect */
    /** @private */
    this.webSocket = null;
    /** @private */
    var pc_config = {};
    /** @private */
    var pc_config_to_use = null;
    /** @private */
    var use_fresh_ice_each_peer = false;

    /**
     * Determines whether fresh ice server configuration should be requested from the server for each peer connection.
     * @param {Boolean} value the default is false.
     */
    this.setUseFreshIceEachPeerConnection = function(value) {
        use_fresh_ice_each_peer = value;
    };

    /**
     * Returns the last ice config supplied by the EasyRTC server. This function is not normally used, it is provided
     * for people who want to try filtering ice server configuration on the client.
     * @return {Object} which has the form {iceServers:[ice_server_entry, ice_server_entry, ...]}
     */
    this.getServerIce = function() {
        return pc_config;
    };

    /**
     * Sets the ice server configuration that will be used in subsequent calls. You only need this function if you are filtering
     * the ice server configuration on the client or if you are using TURN certificates that have a very short lifespan.
     * @param {Object} ice An object with iceServers element containing an array of ice server entries.
     * @example
     *     easyrtc.setIceUsedInCalls( {"iceServers": [
     *      {
     *         "url": "stun:stun.sipgate.net"
     *      },
     *      {
     *         "url": "stun:217.10.68.152"
     *      },
     *      {
     *         "url": "stun:stun.sipgate.net:10000"
     *      }
     *      ]});
     *      easyrtc.call(...);
     */
    this.setIceUsedInCalls = function(ice) {
        if (!ice.iceServers) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Bad ice configuration passed to easyrtc.setIceUsedInCalls");
        }
        else {
            pc_config_to_use = ice;
        }
    };

    /** @private */
    function getRemoteStreamByName(peerConn, otherUser, streamName) {

        var keyToMatch = null;
        var remoteStreams = peerConn.pc.getRemoteStreams();

        // No streamName lead to default
        if (!streamName) {
            streamName = "default";
        }

        // default lead to first if available
        if (streamName === "default") {
            if (remoteStreams.length > 0) {
                return remoteStreams[0];
            }
            else {
                return null;
            }
        }

        // Get mediaIds from user roomData
        for (var roomName in self.roomData) {
            if (self.roomData.hasOwnProperty(roomName)) {
                var mediaIds = self.getRoomApiField(roomName, otherUser, "mediaIds");
                keyToMatch = mediaIds ? mediaIds[streamName] : null;
                if (keyToMatch) {
                    break;
                }
            }
        }

        //
        if (!keyToMatch) {
            self.showError(self.errCodes.DEVELOPER_ERR, "remote peer does not have media stream called " + streamName);
        }

        //
        for (var i = 0; i < remoteStreams.length; i++) {
            var remoteId;
            if (remoteStreams[i].id) {
                remoteId = remoteStreams[i].id;
            }  else {
                remoteId = "default";
            }

            if (
                !keyToMatch || // No match
                    remoteId === keyToMatch || // Full match
                        remoteId.indexOf(keyToMatch) === 0 // Partial match
            ) {
                return remoteStreams[i];
            }

        }

        return null;
    }

    /**
     * @private
     * @param {string} easyrtcid
     * @param {boolean} checkAudio
     * @param {string} streamName
     */
    function _haveTracks(easyrtcid, checkAudio, streamName) {
        var stream, peerConnObj;
        if (!easyrtcid) {
            stream = getLocalMediaStreamByName(streamName);
        }
        else {
            peerConnObj = peerConns[easyrtcid];
            if (!peerConnObj) {
                self.showError(self.errCodes.DEVELOPER_ERR, "haveTracks called about a peer you don't have a connection to");
                return false;
            }
            stream = getRemoteStreamByName(peerConns[easyrtcid], easyrtcid, streamName);
        }
        if (!stream) {
            return false;
        }

        var tracks;
        try {

            if (checkAudio) {
                tracks = stream.getAudioTracks();
            }
            else {
                tracks = stream.getVideoTracks();
            }

        } catch (oops) {
            // TODO why do we return true here ?
            return true;
        }

        if (!tracks) {
            return false;
        }

        return tracks.length > 0;
    }

    /** Determines if a particular peer2peer connection has an audio track.
     * @param {String} easyrtcid - the id of the other caller in the connection. If easyrtcid is not supplied, checks the local media.
     * @param {String} streamName - an optional stream id.
     * @return {Boolean} true if there is an audio track or the browser can't tell us.
     */
    this.haveAudioTrack = function(easyrtcid, streamName) {
        return _haveTracks(easyrtcid, true, streamName);
    };

    /** Determines if a particular peer2peer connection has a video track.
     * @param {String} easyrtcid - the id of the other caller in the connection. If easyrtcid is not supplied, checks the local media.
     * @param {String} streamName - an optional stream id.     *
     * @return {Boolean} true if there is an video track or the browser can't tell us.
     */
    this.haveVideoTrack = function(easyrtcid, streamName) {
        return _haveTracks(easyrtcid, false, streamName);
    };

    /**
     * Gets a data field associated with a room.
     * @param {String} roomName - the name of the room.
     * @param {String} fieldName - the name of the field.
     * @return {Object} dataValue - the value of the field if present, undefined if not present.
     */
    this.getRoomField = function(roomName, fieldName) {
        var fields = self.getRoomFields(roomName);
        return (!fields || !fields[fieldName]) ? undefined : fields[fieldName].fieldValue;
    };

    /** @private */
    var fields = null;

    /** @private */
    var preallocatedSocketIo = null;

    /** @private */
    var closedChannel = null;

    //
    // easyrtc.disconnect performs a clean disconnection of the client from the server.
    //
    function disconnectBody() {
        var key;
        self.loggingOut = true;
        offersPending = {};
        acceptancePending = {};
        self.disconnecting = true;
        closedChannel = self.webSocket;
        if (self.webSocketConnected) {
            if (!preallocatedSocketIo) {
                self.webSocket.close();
            }
            self.webSocketConnected = false;
        }
        self.hangupAll();
        if (roomOccupantListener) {
            for (key in lastLoggedInList) {
                if (lastLoggedInList.hasOwnProperty(key)) {
                    roomOccupantListener(key, {}, false);
                }
            }
        }
        lastLoggedInList = {};
        self.emitEvent("roomOccupant", {});
        self.roomData = {};
        self.roomJoin = {};
        self._roomApiFields = {};
        self.loggingOut = false;
        self.myEasyrtcid = null;
        self.disconnecting = false;
        oldConfig = {};
    }

    /**
     * Disconnect from the EasyRTC server.
     * @example
     *    easyrtc.disconnect();
     */
    this.disconnect = function() {

        logDebug("attempt to disconnect from WebRTC signalling server");

        self.disconnecting = true;
        self.hangupAll();
        self.loggingOut = true;
        //
        // The hangupAll may try to send configuration information back to the server.
        // Collecting that information is asynchronous, we don't actually close the
        // connection until it's had a chance to be sent. We allocate 100ms for collecting
        // the info, so 250ms should be sufficient for the disconnecting.
        //
        setTimeout(function() {
            if (self.webSocket) {
                try {
                    self.webSocket.disconnect();
                } catch (e) {
                    // we don't really care if this fails.
                }

                closedChannel = self.webSocket;
                self.webSocket = 0;
            }
            self.loggingOut = false;
            self.disconnecting = false;
            if (roomOccupantListener) {
                roomOccupantListener(null, {}, false);
            }
            self.emitEvent("roomOccupant", {});
            oldConfig = {};
        }, 250);
    };

    /** @private */
    //
    // This function is used to send WebRTC signaling messages to another client. These messages all the form:
    //   destUser: some id or null
    //   msgType: one of ["offer"/"answer"/"candidate","reject","hangup", "getRoomList"]
    //   msgData: either null or an SDP record
    //   successCallback: a function with the signature  function(msgType, wholeMsg);
    //   errorCallback: a function with signature function(errorCode, errorText)
    //
    function sendSignalling(destUser, msgType, msgData, successCallback, errorCallback) {
        if (!self.webSocket) {
            throw "Attempt to send message without a valid connection to the server.";
        }
        else {
            var dataToShip = {
                msgType: msgType
            };
            if (destUser) {
                dataToShip.targetEasyrtcid = destUser;
            }
            if (msgData) {
                dataToShip.msgData = msgData;
            }

            logDebug("sending socket message " + JSON.stringify(dataToShip));

            self.webSocket.json.emit("easyrtcCmd", dataToShip,
                    function(ackMsg) {
                        if (ackMsg.msgType !== "error") {
                            if (!ackMsg.hasOwnProperty("msgData")) {
                                ackMsg.msgData = null;
                            }
                            if (successCallback) {
                                successCallback(ackMsg.msgType, ackMsg.msgData);
                            }
                        }
                        else {
                            if (errorCallback) {
                                errorCallback(ackMsg.msgData.errorCode, ackMsg.msgData.errorText);
                            }
                            else {
                                self.showError(ackMsg.msgData.errorCode, ackMsg.msgData.errorText);
                            }
                        }
                    }
            );
        }
    }

    /** @private */
    //
    // This function is used to send large messages. it sends messages that have a transfer field
    // so that the receiver knows it's a transfer message. To differentiate the transfers, a
    // transferId is generated and passed for each message.
    //
    var sendByChunkUidCounter = 0;
    /** @private */
    function sendByChunkHelper(destUser, msgData) {
        var transferId = destUser + '-' + sendByChunkUidCounter++;

        var pos, len, startMessage, message, endMessage;
        var numberOfChunks = Math.ceil(msgData.length / self.maxP2PMessageLength);
        startMessage = {
            transfer: 'start',
            transferId: transferId,
            parts: numberOfChunks
        };

        endMessage = {
            transfer: 'end',
            transferId: transferId
        };

        peerConns[destUser].dataChannelS.send(JSON.stringify(startMessage));

        for (pos = 0, len = msgData.length; pos < len; pos += self.maxP2PMessageLength) {
            message = {
                transferId: transferId,
                data: msgData.substr(pos, self.maxP2PMessageLength),
                transfer: 'chunk'
            };
            peerConns[destUser].dataChannelS.send(JSON.stringify(message));
        }

        peerConns[destUser].dataChannelS.send(JSON.stringify(endMessage));
    }

    /**
     *Sends data to another user using previously established data channel. This method will
     * fail if no data channel has been established yet. Unlike the easyrtc.sendWS method,
     * you can't send a dictionary, convert dictionaries to strings using JSON.stringify first.
     * What data types you can send, and how large a data type depends on your browser.
     * @param {String} destUser (an easyrtcid)
     * @param {String} msgType - the type of message being sent (application specific).
     * @param {Object} msgData - a JSONable object.
     * @example
     *     easyrtc.sendDataP2P(someEasyrtcid, "roomData", {room:499, bldgNum:'asd'});
     */
    this.sendDataP2P = function(destUser, msgType, msgData) {

        var flattenedData = JSON.stringify({msgType: msgType, msgData: msgData});
        logDebug("sending p2p message to " + destUser + " with data=" + JSON.stringify(flattenedData));

        if (!peerConns[destUser]) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Attempt to send data peer to peer without a connection to " + destUser + ' first.');
        }
        else if (!peerConns[destUser].dataChannelS) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Attempt to send data peer to peer without establishing a data channel to " + destUser + ' first.');
        }
        else if (!peerConns[destUser].dataChannelReady) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Attempt to use data channel to " + destUser + " before it's ready to send.");
        }
        else {
            try {
                if (flattenedData.length > self.maxP2PMessageLength) {
                    sendByChunkHelper(destUser, flattenedData);
                } else {
                    peerConns[destUser].dataChannelS.send(flattenedData);
                }
            } catch (sendDataErr) {
                logDebug("sendDataP2P error: ", sendDataErr);
                throw sendDataErr;
            }
        }
    };

    /** Sends data to another user using websockets. The easyrtc.sendServerMessage or easyrtc.sendPeerMessage methods
     * are wrappers for this method; application code should use them instead.
     * @param {String} destination - either a string containing the easyrtcId of the other user, or an object containing some subset of the following fields: targetEasyrtcid, targetGroup, targetRoom.
     * Specifying multiple fields restricts the scope of the destination (operates as a logical AND, not a logical OR).
     * @param {String} msgType -the type of message being sent (application specific).
     * @param {Object} msgData - a JSONable object.
     * @param {Function} ackhandler - by default, the ackhandler handles acknowledgments from the server that your message was delivered to it's destination.
     * However, application logic in the server can over-ride this. If you leave this null, a stub ackHandler will be used. The ackHandler
     * gets passed a message with the same msgType as your outgoing message, or a message type of "error" in which case
     * msgData will contain a errorCode and errorText fields.
     * @example
     *    easyrtc.sendDataWS(someEasyrtcid, "setPostalAddress", {room:499, bldgNum:'asd'},
     *      function(ackMsg){
     *          console.log("saw the following acknowledgment " + JSON.stringify(ackMsg));
     *      }
     *    );
     */
    this.sendDataWS = function(destination, msgType, msgData, ackhandler) {
        logDebug("sending client message via websockets to " + destination + " with data=" + JSON.stringify(msgData));

        if (!ackhandler) {
            ackhandler = function(msg) {
                if (msg.msgType === "error") {
                    self.showError(msg.msgData.errorCode, msg.msgData.errorText);
                }
            };
        }

        var outgoingMessage = {
            msgType: msgType,
            msgData: msgData
        };

        if (destination) {
            if (typeof destination === 'string') {
                outgoingMessage.targetEasyrtcid = destination;
            }
            else if (typeof destination === 'object') {
                if (destination.targetEasyrtcid) {
                    outgoingMessage.targetEasyrtcid = destination.targetEasyrtcid;
                }
                if (destination.targetRoom) {
                    outgoingMessage.targetRoom = destination.targetRoom;
                }
                if (destination.targetGroup) {
                    outgoingMessage.targetGroup = destination.targetGroup;
                }
            }
        }

        if (self.webSocket) {
            self.webSocket.json.emit("easyrtcMsg", outgoingMessage, ackhandler);
        }
        else {
            logDebug("websocket failed because no connection to server");

            throw "Attempt to send message without a valid connection to the server.";
        }
    };

    /** Sends data to another user. This method uses data channels if one has been set up, or websockets otherwise.
     * @param {String} destUser - a string containing the easyrtcId of the other user.
     * Specifying multiple fields restricts the scope of the destination (operates as a logical AND, not a logical OR).
     * @param {String} msgType -the type of message being sent (application specific).
     * @param {Object} msgData - a JSONable object.
     * @param {Function} ackHandler - a function which receives acknowledgments. May only be invoked in
     *  the websocket case.
     * @example
     *    easyrtc.sendData(someEasyrtcid, "roomData",  {room:499, bldgNum:'asd'},
     *       function ackHandler(msgType, msgData);
     *    );
     */
    this.sendData = function(destUser, msgType, msgData, ackHandler) {
        if (peerConns[destUser] && peerConns[destUser].dataChannelReady) {
            self.sendDataP2P(destUser, msgType, msgData);
        }
        else {
            self.sendDataWS(destUser, msgType, msgData, ackHandler);
        }
    };

    /**
     * Sends a message to another peer on the easyrtcMsg channel.
     * @param {String} destination - either a string containing the easyrtcId of the other user, or an object containing some subset of the following fields: targetEasyrtcid, targetGroup, targetRoom.
     * Specifying multiple fields restricts the scope of the destination (operates as a logical AND, not a logical OR).
     * @param {String} msgType - the type of message being sent (application specific).
     * @param {Object} msgData - a JSONable object with the message contents.
     * @param {function(String, Object)} successCB - a callback function with results from the server.
     * @param {function(String, String)} failureCB - a callback function to handle errors.
     * @example
     *     easyrtc.sendPeerMessage(otherUser, 'offer_candy', {candy_name:'mars'},
     *             function(msgType, msgBody ){
     *                console.log("message was sent");
     *             },
     *             function(errorCode, errorText){
     *                console.log("error was " + errorText);
     *             });
     */
    this.sendPeerMessage = function(destination, msgType, msgData, successCB, failureCB) {
        if (!destination) {
            self.showError(self.errCodes.DEVELOPER_ERR, "destination was null in sendPeerMessage");
        }

        logDebug("sending peer message " + JSON.stringify(msgData));

        function ackHandler(response) {
            if (response.msgType === "error") {
                if (failureCB) {
                    failureCB(response.msgData.errorCode, response.msgData.errorText);
                }
            }
            else {
                if (successCB) {
                    // firefox complains if you pass an undefined as an parameter.
                    successCB(response.msgType, response.msgData ? response.msgData : null);
                }
            }
        }

        self.sendDataWS(destination, msgType, msgData, ackHandler);
    };

    /**
     * Sends a message to the application code in the server (ie, on the easyrtcMsg channel).
     * @param {String} msgType - the type of message being sent (application specific).
     * @param {Object} msgData - a JSONable object with the message contents.
     * @param {function(String, Object)} successCB - a callback function with results from the server.
     * @param {function(String, String)} failureCB - a callback function to handle errors.
     * @example
     *     easyrtc.sendServerMessage('get_candy', {candy_name:'mars'},
     *             function(msgType, msgData ){
     *                console.log("got candy count of " + msgData.barCount);
     *             },
     *             function(errorCode, errorText){
     *                console.log("error was " + errorText);
     *             });
     */
    this.sendServerMessage = function(msgType, msgData, successCB, failureCB) {

        var dataToShip = {msgType: msgType, msgData: msgData};
        logDebug("sending server message " + JSON.stringify(dataToShip));

        function ackhandler(response) {
            if (response.msgType === "error") {
                if (failureCB) {
                    failureCB(response.msgData.errorCode, response.msgData.errorText);
                }
            }
            else {
                if (successCB) {
                    successCB(response.msgType, response.msgData ? response.msgData : null);
                }
            }
        }

        self.sendDataWS(null, msgType, msgData, ackhandler);
    };

    /** Sends the server a request for the list of rooms the user can see.
     * You must have already be connected to use this function.
     * @param {function(Object)} callback - on success, this function is called with a map of the form  { roomName:{"roomName":String, "numberClients": Number}}.
     * The roomName appears as both the key to the map, and as the value of the "roomName" field.
     * @param {function(String, String)} errorCallback   is called on failure. It gets an errorCode and errorText as it's too arguments.
     * @example
     *    easyrtc.getRoomList(
     *        function(roomList){
     *           for(roomName in roomList){
     *              console.log("saw room " + roomName);
     *           }
     *         },
     *         function(errorCode, errorText){
     *            easyrtc.showError(errorCode, errorText);
     *         }
     *    );
     */
    this.getRoomList = function(callback, errorCallback) {
        sendSignalling(null, "getRoomList", null,
                function(msgType, msgData) {
                    callback(msgData.roomList);
                },
                function(errorCode, errorText) {
                    if (errorCallback) {
                        errorCallback(errorCode, errorText);
                    }
                    else {
                        self.showError(errorCode, errorText);
                    }
                }
        );
    };

    /** Value returned by easyrtc.getConnectStatus if the other user isn't connected to us. */
    this.NOT_CONNECTED = "not connected";

    /** Value returned by easyrtc.getConnectStatus if the other user is in the process of getting connected */
    this.BECOMING_CONNECTED = "connection in progress to us.";

    /** Value returned by easyrtc.getConnectStatus if the other user is connected to us. */
    this.IS_CONNECTED = "is connected";

    /**
     * Check if the client has a peer-2-peer connection to another user.
     * The return values are text strings so you can use them in debugging output.
     *  @param {String} otherUser - the easyrtcid of the other user.
     *  @return {String} one of the following values: easyrtc.NOT_CONNECTED, easyrtc.BECOMING_CONNECTED, easyrtc.IS_CONNECTED
     *  @example
     *     if( easyrtc.getConnectStatus(otherEasyrtcid) == easyrtc.NOT_CONNECTED ){
     *         easyrtc.call(otherEasyrtcid,
     *                  function(){ console.log("success"); },
     *                  function(){ console.log("failure"); });
     *     }
     */
    this.getConnectStatus = function(otherUser) {
        if (!peerConns.hasOwnProperty(otherUser)) {
            return self.NOT_CONNECTED;
        }
        var peer = peerConns[otherUser];
        if ((peer.sharingAudio || peer.sharingVideo) && !peer.startedAV) {
            return self.BECOMING_CONNECTED;
        }
        else if (peer.sharingData && !peer.dataChannelReady) {
            return self.BECOMING_CONNECTED;
        }
        else {
            return self.IS_CONNECTED;
        }
    };

    /**
     * @private
     */
    function buildPeerConstraints() {
        var options = [];
        options.push({'DtlsSrtpKeyAgreement': 'true'}); // for interoperability
        return {optional: options};
    }

    /** @private */
    function sendQueuedCandidates(peer, onSignalSuccess, onSignalFailure) {
        var i;
        for (i = 0; i < peerConns[peer].candidatesToSend.length; i++) {
            sendSignalling(
                    peer,
                    "candidate",
                    peerConns[peer].candidatesToSend[i],
                    onSignalSuccess,
                    onSignalFailure
                    );
        }
    }

    /** @private */
    //
    // This function calls the users onStreamClosed handler, passing it the easyrtcid of the peer, the stream itself,
    // and the name of the stream.
    //
    function emitOnStreamClosed(easyrtcid, stream) {
        if (!peerConns[easyrtcid]) {
            return;
        }
        var streamName;
        var id;
        if (stream.id) {
            id = stream.id;
        }
        else {
            id = "default";
        }
        streamName = peerConns[easyrtcid].remoteStreamIdToName[id] || "default";
        if (peerConns[easyrtcid].liveRemoteStreams[streamName] &&
            self.onStreamClosed) {
            delete peerConns[easyrtcid].liveRemoteStreams[streamName];
            self.onStreamClosed(easyrtcid, stream, streamName);
        }
        delete peerConns[easyrtcid].remoteStreamIdToName[id];
    }

    /** @private */
    function onRemoveStreamHelper(easyrtcid, stream) {
        if (peerConns[easyrtcid]) {
            emitOnStreamClosed(easyrtcid, stream);
            updateConfigurationInfo();
            if (peerConns[easyrtcid].pc) {
                 try {
                    peerConns[easyrtcid].pc.removeStream(stream);
                 } catch( err) {}
            }
        }
    }

    /** @private */
    function buildDeltaRecord(added, deleted) {
        function objectNotEmpty(obj) {
            var i;
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    return true;
                }
            }
            return false;
        }

        var result = {};
        if (objectNotEmpty(added)) {
            result.added = added;
        }

        if (objectNotEmpty(deleted)) {
            result.deleted = deleted;
        }

        if (objectNotEmpty(result)) {
            return result;
        }
        else {
            return null;
        }
    }

    /** @private */
    function findDeltas(oldVersion, newVersion) {
        var i;
        var added = {}, deleted = {};
        var subPart;
        for (i in newVersion) {
            if (newVersion.hasOwnProperty(i)) {
                if (oldVersion === null || typeof oldVersion[i] === 'undefined') {
                    added[i] = newVersion[i];
                }
                else if (typeof newVersion[i] === 'object') {
                    subPart = findDeltas(oldVersion[i], newVersion[i]);
                    if (subPart !== null) {
                        added[i] = newVersion[i];
                    }
                }
                else if (newVersion[i] !== oldVersion[i]) {
                    added[i] = newVersion[i];
                }
            }
        }
        for (i in oldVersion) {
            if (newVersion.hasOwnProperty(i)) {
                if (typeof newVersion[i] === 'undefined') {
                    deleted[i] = oldVersion[i];
                }
            }
        }

        return buildDeltaRecord(added, deleted);
    }

    /** @private */
    //
    // this function collects configuration info that will be sent to the server.
    // It returns that information, leaving it the responsibility of the caller to
    // do the actual sending.
    //
    function collectConfigurationInfo(/* forAuthentication */) {
        var p2pList = {};
        var i;
        for (i in peerConns) {
            if (!peerConns.hasOwnProperty(i)) {
                continue;
            }
            p2pList[i] = {
                connectTime: peerConns[i].connectTime,
                isInitiator: !!peerConns[i].isInitiator
            };
        }

        var newConfig = {
            userSettings: {
                sharingAudio: !!haveAudioVideo.audio,
                sharingVideo: !!haveAudioVideo.video,
                sharingData: !!dataEnabled,
                nativeVideoWidth: self.nativeVideoWidth,
                nativeVideoHeight: self.nativeVideoHeight,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                cookieEnabled: navigator.cookieEnabled,
                os: navigator.oscpu,
                language: navigator.language
            }
        };

        if (!isEmptyObj(p2pList)) {
            newConfig.p2pList = p2pList;
        }

        return newConfig;
    }

    /** @private */
    function updateConfiguration() {

        var newConfig = collectConfigurationInfo(false);
        //
        // we need to give the getStats calls a chance to fish out the data.
        // The longest I've seen it take is 5 milliseconds so 100 should be overkill.
        //
        var sendDeltas = function() {
            var alteredData = findDeltas(oldConfig, newConfig);
            //
            // send all the configuration information that changes during the session
            //
            if (alteredData) {
                logDebug("cfg=" + JSON.stringify(alteredData.added));

                if (self.webSocket) {
                    sendSignalling(null, "setUserCfg", {setUserCfg: alteredData.added}, null, null);
                }
            }
            oldConfig = newConfig;
        };
        if (oldConfig === {}) {
            sendDeltas();
        }
        else {
            setTimeout(sendDeltas, 100);
        }
    }

    // Parse the uint32 PRIORITY field into its constituent parts from RFC 5245,
    // type preference, local preference, and (256 - component ID).
    // ex: 126 | 32252 | 255 (126 is host preference, 255 is component ID 1)
    function formatPriority(priority) {
        var s = '';
        s += (priority >> 24);
        s += ' | ';
        s += (priority >> 8) & 0xFFFF;
        s += ' | ';
        s += priority & 0xFF;
        return s;
    }

    // Parse a candidate:foo string into an object, for easier use by other methods.
    /** @private */
    function parseCandidate(text) {
        var candidateStr = 'candidate:';
        var pos = text.indexOf(candidateStr) + candidateStr.length;
        var fields = text.substr(pos).split(' ');
        return {
            'component': fields[1],
            'type': fields[7],
            'foundation': fields[0],
            'protocol': fields[2],
            'address': fields[4],
            'port': fields[5],
            'priority': formatPriority(fields[3])
        };
    }

    /** @private */
    function processCandicate(candicate) {
        self._candicates = self._candicates || [];
        self._candicates.push(parseCandidate(candicate));
    }

    function processAddedStream(otherUser, theStream) {
        if (!peerConns[otherUser] ||  peerConns[otherUser].cancelled) {
            return;
        }

        var peerConn = peerConns[otherUser];

        if (!peerConn.startedAV) {
            peerConn.startedAV = true;
            peerConn.sharingAudio = haveAudioVideo.audio;
            peerConn.sharingVideo = haveAudioVideo.video;
            peerConn.connectTime = new Date().getTime();
            if (peerConn.callSuccessCB) {
                if (peerConn.sharingAudio || peerConn.sharingVideo) {
                    peerConn.callSuccessCB(otherUser, "audiovideo");
                }
            }
            if (self.audioEnabled || self.videoEnabled) {
                updateConfiguration();
            }
        }

        var remoteName = getNameOfRemoteStream(otherUser, theStream.id || "default");
        if (!remoteName) {
            remoteName = "default";
        }
        peerConn.remoteStreamIdToName[theStream.id || "default"] = remoteName;
        peerConn.liveRemoteStreams[remoteName] = true;
        theStream.streamName = remoteName;
        if (self.streamAcceptor) {
            self.streamAcceptor(otherUser, theStream, remoteName);
            //
            // Inform the other user that the stream they provided has been received.
            // This should be moved into signalling at some point
            //
            self.sendDataWS(otherUser, "easyrtc_streamReceived", {streamName:remoteName},function(){});
        }
    }

    function processAddedTrack(otherUser, peerStreams) {

        if (!peerConns[otherUser] ||  peerConns[otherUser].cancelled) {
            return;
        }

        var peerConn = peerConns[otherUser];
        peerConn.trackTimers = peerConn.trackTimers || {};

        // easyrtc thinks in terms of streams, not tracks.
        // so we'll add a timeout when the first track event
        // fires. Firefox produces two events (one of type "video",
        // and one of type "audio".

        for (var i = 0, l = peerStreams.length; i < l; i++) {
            var peerStream = peerStreams[i],
                streamId = peerStream.id || "default";
            clearTimeout(peerConn.trackTimers[streamId]);
            peerConn.trackTimers[streamId] = setTimeout(function(peerStream) {
               processAddedStream(peerConn, otherUser, peerStream);
            }.bind(peerStream), 100); // Bind peerStream
        }
    }

    /** @private */
    // TODO split buildPeerConnection it more thant 500 lines
    function buildPeerConnection(otherUser, isInitiator, failureCB, streamNames) {
        var pc;
        var message;
        var newPeerConn;
        var iceConfig = pc_config_to_use ? pc_config_to_use : pc_config;

        logDebug("building peer connection to " + otherUser);

        //
        // we don't support data channels on chrome versions < 31
        //

        try {

            pc = self.createRTCPeerConnection(iceConfig, buildPeerConstraints());

            if (!pc) {
                message = "Unable to create PeerConnection object, check your ice configuration(" + JSON.stringify(iceConfig) + ")";
                logDebug(message);
                throw Error(message);
            }

            //
            // turn off data channel support if the browser doesn't support it.
            //

            if (dataEnabled && typeof pc.createDataChannel === 'undefined') {
                dataEnabled = false;
            }

            pc.onnegotiationneeded = function(event) {
                if (
                    peerConns[otherUser] &&
                        (peerConns[otherUser].enableNegotiateListener)
                ) {
                    pc.createOffer(function(sdp) {
                        if (sdpLocalFilter) {
                            sdp.sdp = sdpLocalFilter(sdp.sdp);
                        }
                        pc.setLocalDescription(sdp, function() {
                            self.sendPeerMessage(otherUser, "__addedMediaStream", {
                                sdp: sdp
                            });

                        }, function() {
                        });
                    }, function(error) {
                        logDebug("unexpected error in creating offer");
                    });
                }
            };

            pc.onsignalingstatechange = function () {

                var eventTarget = event.currentTarget || event.target || pc,
                    signalingState = eventTarget.signalingState || 'unknown';

                if (signalingStateChangeListener) {
                   signalingStateChangeListener(otherUser, eventTarget, signalingState);
                }
            };

            pc.oniceconnectionstatechange = function(event) {

                var eventTarget = event.currentTarget || event.target || pc,
                    connState = eventTarget.iceConnectionState || 'unknown';

                if (iceConnectionStateChangeListener) {
                   iceConnectionStateChangeListener(otherUser, eventTarget, connState);
                }

                switch (connState) {
                    case "connected":
                        if (self.onPeerOpen ) {
                            self.onPeerOpen(otherUser);
                        }
                        if (peerConns[otherUser] && peerConns[otherUser].callSuccessCB) {
                            peerConns[otherUser].callSuccessCB(otherUser, "connection");
                        }
                        break;
                    case "failed":
                        if (failureCB) {
                            failureCB(self.errCodes.NOVIABLEICE, "No usable STUN/TURN path");
                        }
                        delete peerConns[otherUser];
                        break;
                    case "disconnected":
                        if (self.onPeerFailing) {
                            self.onPeerFailing(otherUser);
                        }
                        if (peerConns[otherUser]) {
                            peerConns[otherUser].failing = Date.now();
                        }
                        break;

                    case "closed":
                        if (self.onPeerClosed) {
                            self.onPeerClosed(otherUser);
                        }
                        break;
                    case "completed":
                        if (peerConns[otherUser]) {
                            if (peerConns[otherUser].failing && self.onPeerRecovered) {
                                self.onPeerRecovered(otherUser, peerConns[otherUser].failing, Date.now());
                            }
                            delete peerConns[otherUser].failing;
                         }
                        break;
                }
            };

            pc.onconnection = function() {
                logDebug("onconnection called prematurely");
            };

            newPeerConn = {
                pc: pc,
                candidatesToSend: [],
                startedAV: false,
                connectionAccepted: false,
                isInitiator: isInitiator,
                remoteStreamIdToName: {},
                streamsAddedAcks: {},
                liveRemoteStreams: {}
            };

            pc.onicecandidate = function(event) {
                if (peerConns[otherUser] && peerConns[otherUser].cancelled) {
                    return;
                }
                var candidateData;
                if (event.candidate && peerConns[otherUser]) {
                    candidateData = {
                        type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    };

                    if (iceCandidateFilter ) {
                       candidateData = iceCandidateFilter(candidateData, false);
                       if( !candidateData ) {
                          return;
                       }
                    }
                    //
                    // some candidates include ip addresses of turn servers. we'll want those
                    // later so we can see if our actual connection uses a turn server.
                    // The keyword "relay" in the candidate identifies it as referencing a
                    // turn server. The \d symbol in the regular expression matches a number.
                    //
                    processCandicate(event.candidate.candidate);

                    if (peerConns[otherUser].connectionAccepted) {
                        sendSignalling(otherUser, "candidate", candidateData, null, function() {
                            failureCB(self.errCodes.PEER_GONE, "Candidate disappeared");
                        });
                    }
                    else {
                        peerConns[otherUser].candidatesToSend.push(candidateData);
                    }
                }
            };

            pc.ontrack = function(event) {
                logDebug("empty ontrack method invoked, which is expected");
                processAddedTrack(otherUser, event.streams);
            };

            pc.onaddstream = function(event) {
                logDebug("empty onaddstream method invoked, which is expected");
                processAddedStream(otherUser, event.stream);
            };

            pc.onremovestream = function(event) {
                logDebug("saw remove on remote media stream");
                onRemoveStreamHelper(otherUser, event.stream);
            };

            // Register PeerConn
            peerConns[otherUser] = newPeerConn;

        } catch (error) {
            logDebug('buildPeerConnection error', error);
            failureCB(self.errCodes.SYSTEM_ERR, error.message);
            return null;
        }

        var i, stream;
        if (streamNames) {
            for (i = 0; i < streamNames.length; i++) {
                stream = getLocalMediaStreamByName(streamNames[i]);
                if (stream) {
                    pc.addStream(stream);
                }
                else {
                    logDebug("Developer error, attempt to access unknown local media stream " + streamNames[i]);
                }
            }
        }
        else if (autoInitUserMedia && (self.videoEnabled || self.audioEnabled)) {
            stream = self.getLocalStream();
            pc.addStream(stream);
        }

        //
        // This function handles data channel message events.
        //
        var pendingTransfer = {};
        function dataChannelMessageHandler(event) {
            logDebug("saw dataChannel.onmessage event: ", event.data);

            if (event.data === "dataChannelPrimed") {
                self.sendDataWS(otherUser, "dataChannelPrimed", "");
            }
            else {
                //
                // Chrome and Firefox Interop is passing a event with a strange data="", perhaps
                // as it's own form of priming message. Comparing the data against "" doesn't
                // work, so I'm going with parsing and trapping the parse error.
                //
                var msg;

                try {
                    msg = JSON.parse(event.data);
                } catch (err) {
                    logDebug('Developer error, unable to parse event data');
                }

                if (msg) {
                    if (msg.transfer && msg.transferId) {
                        if (msg.transfer === 'start') {
                            logDebug('start transfer #' + msg.transferId);

                            var parts = parseInt(msg.parts);
                            pendingTransfer = {
                                chunks: [],
                                parts: parts,
                                transferId: msg.transferId
                            };

                        } else if (msg.transfer === 'chunk') {
                            logDebug('got chunk for transfer #' + msg.transferId);

                            // check data is valid
                            if (!(typeof msg.data === 'string' && msg.data.length <= self.maxP2PMessageLength)) {
                                logDebug('Developer error, invalid data');

                                // check there's a pending transfer
                            } else if (!pendingTransfer) {
                                logDebug('Developer error, unexpected chunk');

                            // check that transferId is valid
                            } else if (msg.transferId !== pendingTransfer.transferId) {
                                logDebug('Developer error, invalid transfer id');

                            // check that the max length of transfer is not reached
                            } else if (pendingTransfer.chunks.length + 1 > pendingTransfer.parts) {
                                logDebug('Developer error, received too many chunks');

                            } else {
                                pendingTransfer.chunks.push(msg.data);
                            }

                        } else if (msg.transfer === 'end') {
                            logDebug('end of transfer #' + msg.transferId);

                            // check there's a pending transfer
                            if (!pendingTransfer) {
                                logDebug('Developer error, unexpected end of transfer');

                            // check that transferId is valid
                            } else if (msg.transferId !== pendingTransfer.transferId) {
                                logDebug('Developer error, invalid transfer id');

                            // check that all the chunks were received
                            } else if (pendingTransfer.chunks.length !== pendingTransfer.parts) {
                                logDebug('Developer error, received wrong number of chunks');

                            } else {
                                var chunkedMsg;
                                try {
                                    chunkedMsg = JSON.parse(pendingTransfer.chunks.join(''));
                                } catch (err) {
                                    logDebug('Developer error, unable to parse message');
                                }

                                if (chunkedMsg) {
                                    self.receivePeerDistribute(otherUser, chunkedMsg, null);
                                }
                            }
                            pendingTransfer = {  };

                        } else {
                            logDebug('Developer error, got an unknown transfer message' + msg.transfer);
                        }
                    } else {
                        self.receivePeerDistribute(otherUser, msg, null);
                    }
                }
            }
        }

        function initOutGoingChannel(otherUser) {
            logDebug("saw initOutgoingChannel call");

            var dataChannel = pc.createDataChannel(dataChannelName, self.getDatachannelConstraints());
            peerConns[otherUser].dataChannelS = dataChannel;
            peerConns[otherUser].dataChannelR = dataChannel;
            dataChannel.onmessage = dataChannelMessageHandler;
            dataChannel.onopen = function(event) {
                logDebug("saw dataChannel.onopen event");

                if (peerConns[otherUser]) {
                    dataChannel.send("dataChannelPrimed");
                }
            };
            dataChannel.onclose = function(event) {
                logDebug("saw dataChannelS.onclose event");

                if (peerConns[otherUser]) {
                    peerConns[otherUser].dataChannelReady = false;
                    delete peerConns[otherUser].dataChannelS;
                }
                if (onDataChannelClose) {
                    onDataChannelClose(otherUser);
                }

                updateConfigurationInfo();
            };
        }

        function initIncomingChannel(otherUser) {
            logDebug("initializing incoming channel handler for " + otherUser);

            peerConns[otherUser].pc.ondatachannel = function(event) {

                logDebug("saw incoming data channel");

                var dataChannel = event.channel;
                peerConns[otherUser].dataChannelR = dataChannel;
                peerConns[otherUser].dataChannelS = dataChannel;
                peerConns[otherUser].dataChannelReady = true;
                dataChannel.onmessage = dataChannelMessageHandler;
                dataChannel.onclose = function(event) {
                    logDebug("saw dataChannelR.onclose event");

                    if (peerConns[otherUser]) {
                        peerConns[otherUser].dataChannelReady = false;
                        delete peerConns[otherUser].dataChannelR;
                    }
                    if (onDataChannelClose) {
                        onDataChannelClose(otherUser);
                    }

                    updateConfigurationInfo();
                };
                dataChannel.onopen = function(event) {
                    logDebug("saw dataChannel.onopen event");

                    if (peerConns[otherUser]) {
                        dataChannel.send("dataChannelPrimed");
                    }
                };
            };
        }

        //
        //  added for interoperability
        //
        // TODO check if both sides have the same browser and versions
        if (dataEnabled) {
            self.setPeerListener(function() {
                if (peerConns[otherUser]) {
                    peerConns[otherUser].dataChannelReady = true;
                    if (peerConns[otherUser].callSuccessCB) {
                        peerConns[otherUser].callSuccessCB(otherUser, "datachannel");
                    }
                    if (onDataChannelOpen) {
                        onDataChannelOpen(otherUser, true);
                    }
                    updateConfigurationInfo();
                } else {
                    logDebug("failed to setup outgoing channel listener");
                }
            }, "dataChannelPrimed", otherUser);

            if (isInitiator) {
                try {

                    initOutGoingChannel(otherUser);
                } catch (channelErrorEvent) {
                    logDebug("failed to init outgoing channel");
                    failureCB(self.errCodes.SYSTEM_ERR,
                            self.formatError(channelErrorEvent));
                }
            }
            if (!isInitiator) {
                initIncomingChannel(otherUser);
            }
        }

        pc.onconnection = function() {
            logDebug("setup pc.onconnection ");
        };

        //
        // Temporary support for responding to acknowledgements of about streams being added.
        //
        self.setPeerListener(function(easyrtcid, msgType, msgData, targeting){
             if( newPeerConn.streamsAddedAcks[msgData.streamName]) {
                 (newPeerConn.streamsAddedAcks[msgData.streamName])(easyrtcid, msgData.streamName);
                 delete newPeerConn.streamsAddedAcks[msgData.streamName];
             }
        }, "easyrtc_streamReceived", otherUser);
        return pc;
    }

    /** @private */
    function doAnswerBody(caller, msgData, streamNames) {
        var pc = buildPeerConnection(caller, false, function(message) {
            self.showError(self.errCodes.SYSTEM_ERR, message);
        }, streamNames);
        var newPeerConn = peerConns[caller];
        if (!pc) {
            logDebug("buildPeerConnection failed. Call not answered");
            return;
        }
        var setLocalAndSendMessage1 = function(sessionDescription) {

            if (newPeerConn.cancelled) {
                return;
            }

            var sendAnswer = function() {
                logDebug("sending answer");

                function onSignalSuccess() {
                    logDebug("sending success");
                }

                function onSignalFailure(errorCode, errorText) {
                    logDebug("sending error");
                    delete peerConns[caller];
                    self.showError(errorCode, errorText);
                }

                sendSignalling(caller, "answer", sessionDescription, onSignalSuccess, onSignalFailure);
                peerConns[caller].connectionAccepted = true;
                sendQueuedCandidates(caller, onSignalSuccess, onSignalFailure);

                if (pc.connectDataConnection) {
                    logDebug("calling connectDataConnection(5002,5001)");
                    pc.connectDataConnection(5002, 5001);
                }
            };
            if (sdpLocalFilter) {
                sessionDescription.sdp = sdpLocalFilter(sessionDescription.sdp);
            }
            pc.setLocalDescription(sessionDescription, sendAnswer, function(message) {
                self.showError(self.errCodes.INTERNAL_ERR, "setLocalDescription: " + message);
            });
        };
        var sd = new RTCSessionDescription(msgData);

        if (!sd) {
            throw "Could not create the RTCSessionDescription";
        }

        logDebug("sdp ||  " + JSON.stringify(sd));

        var invokeCreateAnswer = function() {
            if (newPeerConn.cancelled) {
                return;
            }
            pc.createAnswer(setLocalAndSendMessage1,
                function(message) {
                    self.showError(self.errCodes.INTERNAL_ERR, "create-answer: " + message);
                },
                receivedMediaConstraints);
        };

        logDebug("about to call setRemoteDescription in doAnswer");

        try {

            if (sdpRemoteFilter) {
                sd.sdp = sdpRemoteFilter(sd.sdp);
            }
            pc.setRemoteDescription(sd, invokeCreateAnswer, function(message) {
                self.showError(self.errCodes.INTERNAL_ERR, "set-remote-description: " + message);
            });
        } catch (srdError) {
            logDebug("set remote description failed");
            self.showError(self.errCodes.INTERNAL_ERR, "setRemoteDescription failed: " + srdError.message);
        }
    }

    /** @private */
    function doAnswer(caller, msgData, streamNames) {
        if (!streamNames && autoInitUserMedia) {
            var localStream = self.getLocalStream();
            if (!localStream && (self.videoEnabled || self.audioEnabled)) {
                self.initMediaSource(
                        function() {
                            doAnswer(caller, msgData);
                        },
                        function(errorCode, error) {
                            self.showError(self.errCodes.MEDIA_ERR, self.format(self.getConstantString("localMediaError")));
                        });
                return;
            }
        }
        if (use_fresh_ice_each_peer) {
            self.getFreshIceConfig(function(succeeded) {
                if (succeeded) {
                    doAnswerBody(caller, msgData, streamNames);
                }
                else {
                    self.showError(self.errCodes.CALL_ERR, "Failed to get fresh ice config");
                }
            });
        }
        else {
            doAnswerBody(caller, msgData, streamNames);
        }
    }


    /** @private */
    function callBody(otherUser, callSuccessCB, callFailureCB, wasAcceptedCB, streamNames) {
        acceptancePending[otherUser] = true;
        var pc = buildPeerConnection(otherUser, true, callFailureCB, streamNames);
        var message;
        if (!pc) {
            message = "buildPeerConnection failed, call not completed";
            logDebug(message);
            throw message;
        }

        peerConns[otherUser].callSuccessCB = callSuccessCB;
        peerConns[otherUser].callFailureCB = callFailureCB;
        peerConns[otherUser].wasAcceptedCB = wasAcceptedCB;
        var peerConnObj = peerConns[otherUser];
        var setLocalAndSendMessage0 = function(sessionDescription) {
            if (peerConnObj.cancelled) {
                return;
            }
            var sendOffer = function() {

                sendSignalling(otherUser, "offer", sessionDescription, null, callFailureCB);
            };
            if (sdpLocalFilter) {
                sessionDescription.sdp = sdpLocalFilter(sessionDescription.sdp);
            }
            pc.setLocalDescription(sessionDescription, sendOffer,
                    function(errorText) {
                        callFailureCB(self.errCodes.CALL_ERR, errorText);
                    });
        };
        setTimeout(function() {
            //
            // if the call was cancelled, we don't want to continue getting the offer.
            // we can tell the call was cancelled because there won't be a peerConn object
            // for it.
            //
            if( !peerConns[otherUser]) {
                return;
            }
            pc.createOffer(setLocalAndSendMessage0, function(errorObj) {
                callFailureCB(self.errCodes.CALL_ERR, JSON.stringify(errorObj));
            },
                    receivedMediaConstraints);
        }, 100);
    }

    /**
     * Initiates a call to another user. If it succeeds, the streamAcceptor callback will be called.
     * @param {String} otherUser - the easyrtcid of the peer being called.
     * @param {Function} callSuccessCB (otherCaller, mediaType) - is called when the datachannel is established or the MediaStream is established. mediaType will have a value of "audiovideo" or "datachannel"
     * @param {Function} callFailureCB (errorCode, errMessage) - is called if there was a system error interfering with the call.
     * @param {Function} wasAcceptedCB (wasAccepted:boolean,otherUser:string) - is called when a call is accepted or rejected by another party. It can be left null.
     * @param {Array} streamNames - optional array of streamNames.
     * @example
     *    easyrtc.call( otherEasyrtcid,
     *        function(easyrtcid, mediaType){
     *           console.log("Got mediaType " + mediaType + " from " + easyrtc.idToName(easyrtcid));
     *        },
     *        function(errorCode, errMessage){
     *           console.log("call to  " + easyrtc.idToName(otherEasyrtcid) + " failed:" + errMessage);
     *        },
     *        function(wasAccepted, easyrtcid){
     *            if( wasAccepted ){
     *               console.log("call accepted by " + easyrtc.idToName(easyrtcid));
     *            }
     *            else{
     *                console.log("call rejected" + easyrtc.idToName(easyrtcid));
     *            }
     *        });
     */
    this.call = function(otherUser, callSuccessCB, callFailureCB, wasAcceptedCB, streamNames) {

        if (streamNames) {
            if (typeof streamNames === "string") { // accept a string argument if passed.
                streamNames = [streamNames];
            }
            else if (typeof streamNames.length === "undefined") {
                self.showError(self.errCodes.DEVELOPER_ERR, "easyrtc.call passed bad streamNames");
                return;
            }
        }

        logDebug("initiating peer to peer call to " + otherUser +
                    " audio=" + self.audioEnabled +
                    " video=" + self.videoEnabled +
                    " data=" + dataEnabled);


        if (!self.supportsPeerConnections()) {
            callFailureCB(self.errCodes.CALL_ERR, self.getConstantString("noWebrtcSupport"));
            return;
        }

        var message;
        //
        // If we are sharing audio/video and we haven't allocated the local media stream yet,
        // we'll do so, recalling our self on success.
        //
        if (!streamNames && autoInitUserMedia) {
            var stream = self.getLocalStream();
            if (!stream && (self.audioEnabled || self.videoEnabled)) {
                self.initMediaSource(function() {
                    self.call(otherUser, callSuccessCB, callFailureCB, wasAcceptedCB);
                }, callFailureCB);
                return;
            }
        }

        if (!self.webSocket) {
            message = "Attempt to make a call prior to connecting to service";
            logDebug(message);
            throw message;
        }

        //
        // If B calls A, and then A calls B before accepting, then A should treat the attempt to
        // call B as a positive offer to B's offer.
        //
        if (offersPending[otherUser]) {
            wasAcceptedCB(true, otherUser);
            doAnswer(otherUser, offersPending[otherUser], streamNames);
            delete offersPending[otherUser];
            self.callCancelled(otherUser, false);
            return;
        }

        // do we already have a pending call?
        if (typeof acceptancePending[otherUser] !== 'undefined') {
            message = "Call already pending acceptance";
            logDebug(message);
            callFailureCB(self.errCodes.ALREADY_CONNECTED, message);
            return;
        }

        if (use_fresh_ice_each_peer) {
            self.getFreshIceConfig(function(succeeded) {
                if (succeeded) {
                    callBody(otherUser, callSuccessCB, callFailureCB, wasAcceptedCB, streamNames);
                }
                else {
                    callFailureCB(self.errCodes.CALL_ERR, "Attempt to get fresh ice configuration failed");
                }
            });
        }
        else {
            callBody(otherUser, callSuccessCB, callFailureCB, wasAcceptedCB, streamNames);
        }
    };

    /** @private */
    //
    // this function check the deprecated MediaStream.ended attribute
    // and new .active. Also fallback .enable on track for Firefox.
    //
    function isStreamActive(stream) {

        var isActive;

        if (stream.active === true || stream.ended === false)  {
            isActive = true;
        } else {
            isActive = stream.getTracks().reduce(function (track) {
                return track.enabled;
            });
        }

        return isActive;
    }

    /** @private */
    var queuedMessages = {};

    /** @private */
    function clearQueuedMessages(caller) {
        queuedMessages[caller] = {
            candidates: []
        };
    }

    /** @private */
    function closePeer(otherUser) {

        if (acceptancePending[otherUser]) {
            delete acceptancePending[otherUser];
        }
        if (offersPending[otherUser]) {
            delete offersPending[otherUser];
        }

        if (
          !peerConns[otherUser].cancelled &&
              peerConns[otherUser].pc
        ) {
            try {
                var remoteStreams = peerConns[otherUser].pc.getRemoteStreams();
                for (var i = 0; i < remoteStreams.length; i++) {
                    if (isStreamActive(remoteStreams[i])) {
                        emitOnStreamClosed(otherUser, remoteStreams[i]);
                        stopStream(remoteStreams[i]);
                    }
                }

                peerConns[otherUser].pc.close();
                peerConns[otherUser].cancelled = true;
                logDebug("peer closed");
            } catch (err) {
                logDebug("peer " + otherUser + " close failed:" + err);
            } finally {
                if (self.onPeerClosed) {
                    self.onPeerClosed(otherUser);
                }
            }
        }
    }

    /** @private */
    function hangupBody(otherUser) {

        logDebug("Hanging up on " + otherUser);
        clearQueuedMessages(otherUser);

        if (peerConns[otherUser]) {

            if (peerConns[otherUser].pc) {
                closePeer(otherUser);
            }

            if (peerConns[otherUser]) {
                delete peerConns[otherUser];
            }

            updateConfigurationInfo();

            if (self.webSocket) {
                sendSignalling(otherUser, "hangup", null, function() {
                    logDebug("hangup succeeds");
                }, function(errorCode, errorText) {
                    logDebug("hangup failed:" + errorText);
                    self.showError(errorCode, errorText);
                });
            }
        }
    }



    /**
     * Hang up on a particular user or all users.
     *  @param {String} otherUser - the easyrtcid of the person to hang up on.
     *  @example
     *     easyrtc.hangup(someEasyrtcid);
     */
    this.hangup = function(otherUser) {
        hangupBody(otherUser);
        updateConfigurationInfo();
    };

    /**
     * Hangs up on all current connections.
     * @example
     *    easyrtc.hangupAll();
     */
    this.hangupAll = function() {

        var sawAConnection = false;
        for (var otherUser in peerConns) {
            if (!peerConns.hasOwnProperty(otherUser)) {
                continue;
            }
            sawAConnection = true;
            hangupBody(otherUser);
        }

        if (sawAConnection) {
            updateConfigurationInfo();
        }
    };

    /**
     * Checks to see if data channels work between two peers.
     * @param {String} otherUser - the other peer.
     * @returns {Boolean} true if data channels work and are ready to be used
     *   between the two peers.
     */
    this.doesDataChannelWork = function(otherUser) {
        if (!peerConns[otherUser]) {
            return false;
        }
        return !!peerConns[otherUser].dataChannelReady;
    };

    /**
     * Return the media stream shared by a particular peer. This is needed when you
     * add a stream in the middle of a call.
     * @param {String} easyrtcid the peer.
     * @param {String} remoteStreamName an optional argument supplying the streamName.
     * @returns {Object} A mediaStream.
     */
    this.getRemoteStream = function(easyrtcid, remoteStreamName) {
        if (!peerConns[easyrtcid]) {
            self.showError(self.errCodes.DEVELOPER_ERR, "attempt to get stream of uncalled party");
            throw "Developer err: no such stream";
        }
        else {
            return getRemoteStreamByName(peerConns[easyrtcid], easyrtcid, remoteStreamName);
        }
    };

    /**
     * Assign a local streamName to a remote stream so that it can be forwarded to other callers.
     * @param {String} easyrtcid the peer supplying the remote stream
     * @param {String} remoteStreamName the streamName supplied by the peer.
     * @param {String} localStreamName streamName used when passing the stream to other peers.
     * @example
     *    easyrtc.makeLocalStreamFromRemoteStream(sourcePeer, "default", "forwardedStream");
     *    easyrtc.call(nextPeer, callSuccessCB, callFailureCB, wasAcceptedCB, ["forwardedStream"]);
     */
    this.makeLocalStreamFromRemoteStream = function(easyrtcid, remoteStreamName, localStreamName) {
        var remoteStream;
        if (peerConns[easyrtcid].pc) {
            remoteStream = getRemoteStreamByName(peerConns[easyrtcid], easyrtcid, remoteStreamName);
            if (remoteStream) {
                registerLocalMediaStreamByName(remoteStream, localStreamName);
            }
            else {
                throw "Developer err: no such stream";
            }
        }
        else {
            throw "Developer err: no such peer ";
        }
    };

    /**
     * Add a named local stream to a call.
     * @param {String} easyrtcId The id of client receiving the stream.
     * @param {String} streamName The name of the stream.
     * @param {Function} receiptHandler is a function that gets called when the other side sends a message
     *   that the stream has been received. The receiptHandler gets called with an easyrtcid and a stream name. This
     *   argument is optional.
     */
    this.addStreamToCall = function(easyrtcId, streamName, receiptHandler) {
        if( !streamName) {
            streamName = "default";
        }
        var stream = getLocalMediaStreamByName(streamName);
        if (!stream) {
            logDebug("attempt to add nonexistent stream " + streamName);
        }
        else if (!peerConns[easyrtcId] || !peerConns[easyrtcId].pc) {
            logDebug("Can't add stream before a call has started.");
        }
        else {
            var pc = peerConns[easyrtcId].pc;
            peerConns[easyrtcId].enableNegotiateListener = true;
            pc.addStream(stream);
            if (receiptHandler) {
                peerConns[easyrtcId].streamsAddedAcks[streamName] = receiptHandler;
            }
        }
    };

    //
    // these three listeners support the ability to add/remove additional media streams on the fly.
    //
    this.setPeerListener(function(easyrtcid, msgType, msgData) {
        if (!peerConns[easyrtcid] || !peerConns[easyrtcid].pc) {
            self.showError(self.errCodes.DEVELOPER_ERR,
                  "Attempt to add additional stream before establishing the base call.");
        }
        else {
            var sdp = msgData.sdp;
            var pc = peerConns[easyrtcid].pc;

            var setLocalAndSendMessage1 = function(sessionDescription) {
                var sendAnswer = function() {
                   logDebug("sending answer");

                   function onSignalSuccess() {
                        logDebug("sending answer succeeded");

                   }

                   function onSignalFailure(errorCode, errorText) {
                        logDebug("sending answer failed");

                       delete peerConns[easyrtcid];
                       self.showError(errorCode, errorText);
                   }

                   sendSignalling(easyrtcid, "answer", sessionDescription,
                           onSignalSuccess, onSignalFailure);
                   peerConns[easyrtcid].connectionAccepted = true;
                   sendQueuedCandidates(easyrtcid, onSignalSuccess, onSignalFailure);
               };

               if (sdpLocalFilter) {
                   sessionDescription.sdp = sdpLocalFilter(sessionDescription.sdp);
               }
               pc.setLocalDescription(sessionDescription, sendAnswer, function(message) {
                   self.showError(self.errCodes.INTERNAL_ERR, "setLocalDescription: " + msgData);
               });
            };

            var invokeCreateAnswer = function() {
               pc.createAnswer(setLocalAndSendMessage1,
                    function(message) {
                        self.showError(self.errCodes.INTERNAL_ERR, "create-answer: " + message);
                    },
                    receivedMediaConstraints);
               self.sendPeerMessage(easyrtcid, "__gotAddedMediaStream", {sdp: sdp});
            };

            logDebug("about to call setRemoteDescription in doAnswer");

            try {

                if (sdpRemoteFilter) {
                    sdp.sdp = sdpRemoteFilter(sdp.sdp);
                }
                pc.setRemoteDescription(new RTCSessionDescription(sdp),
                   invokeCreateAnswer, function(message) {
                    self.showError(self.errCodes.INTERNAL_ERR, "set-remote-description: " + message);
                });
            } catch (srdError) {
                logDebug("saw exception in setRemoteDescription", srdError);
                self.showError(self.errCodes.INTERNAL_ERR, "setRemoteDescription failed: " + srdError.message);
            }
        }
    }, "__addedMediaStream");

    this.setPeerListener(function(easyrtcid, msgType, msgData) {
        if (!peerConns[easyrtcid] || !peerConns[easyrtcid].pc) {
            logDebug("setPeerListener failed: __gotAddedMediaStream Unknow easyrtcid " + easyrtcid);
        }
        else {
            var sdp = msgData.sdp;
            if (sdpRemoteFilter) {
                sdp.sdp = sdpRemoteFilter(sdp.sdp);
            }
            var pc = peerConns[easyrtcid].pc;
            pc.setRemoteDescription(new RTCSessionDescription(sdp), function(){},
                    function(message) {
                       self.showError(self.errCodes.INTERNAL_ERR, "set-remote-description: " + message);
                    });
        }

    }, "__gotAddedMediaStream");

    this.setPeerListener(function(easyrtcid, msgType, msgData) {
        if (!peerConns[easyrtcid] || !peerConns[easyrtcid].pc) {
            logDebug("setPeerListener failed: __closingMediaStream Unknow easyrtcid " + easyrtcid);
        }
        else {
            var stream = getRemoteStreamByName(peerConns[easyrtcid], easyrtcid, msgData.streamName);
            if (stream) {
                onRemoveStreamHelper(easyrtcid, stream);
                stopStream(stream);
            }
        }

    }, "__closingMediaStream");

    /** @private */
    this.dumpPeerConnectionInfo = function() {
        var i;
        for (var peer in peerConns) {
            if (peerConns.hasOwnProperty(peer)) {
                var pc = peerConns[peer].pc;
                var remotes = pc.getRemoteStreams();
                var remoteIds = [];
                for (i = 0; i < remotes.length; i++) {
                    remoteIds.push(remotes[i].id);
                }
                var locals = pc.getLocalStreams();
                var localIds = [];
                for (i = 0; i < locals.length; i++) {
                    localIds.push(locals[i].id);
                }

                logDebug("For peer " + peer);
                logDebug("    " + JSON.stringify({local: localIds, remote: remoteIds}));
            }
        }
    };

    /** @private */
    function onRemoteHangup(otherUser) {

        logDebug("Saw onRemote hangup event");
        clearQueuedMessages(otherUser);

        if (peerConns[otherUser]) {

            if (peerConns[otherUser].pc) {
                closePeer(otherUser);
            }
            else {
                if (self.callCancelled) {
                    self.callCancelled(otherUser, true);
                }
            }

            if (peerConns[otherUser]) {
                delete peerConns[otherUser];
            }
        }
        else {
            if (self.callCancelled) {
                self.callCancelled(otherUser, true);
            }
        }
    }

    /** @private */
    //
    // checks to see if a particular peer is in any room at all.
    //
    function isPeerInAnyRoom(id) {
        var roomName;
        for (roomName in lastLoggedInList) {
            if (!lastLoggedInList.hasOwnProperty(roomName)) {
                continue;
            }
            if (lastLoggedInList[roomName][id]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks to see if a particular peer is present in any room.
     * If it isn't, we assume it's logged out.
     * @param {string} easyrtcid the easyrtcId of the peer.
     */
    this.isPeerInAnyRoom = function(easyrtcid) {
         return isPeerInAnyRoom(easyrtcid);
    };

    /** @private */
    function processLostPeers(peersInRoom) {
        var id;
        //
        // check to see the person is still in at least one room. If not, we'll hangup
        // on them. This isn't the correct behavior, but it's the best we can do without
        // changes to the server.
        //
        for (id in peerConns) {
            if (peerConns.hasOwnProperty(id) &&
                    typeof peersInRoom[id] === 'undefined') {
                if (!isPeerInAnyRoom(id)) {
                    if (peerConns[id].pc || peerConns[id].isInitiator) {
                        onRemoteHangup(id);
                    }
                    delete offersPending[id];
                    delete acceptancePending[id];
                    clearQueuedMessages(id);
                }
            }
        }

        for (id in offersPending) {
            if (offersPending.hasOwnProperty(id) && !isPeerInAnyRoom(id)) {
                onRemoteHangup(id);
                clearQueuedMessages(id);
                delete offersPending[id];
                delete acceptancePending[id];
            }
        }

        for (id in acceptancePending) {
            if (acceptancePending.hasOwnProperty(id) && !isPeerInAnyRoom(id)) {
                onRemoteHangup(id);
                clearQueuedMessages(id);
                delete acceptancePending[id];
            }
        }
    }

    /**
     * The idea of aggregating timers is that there are events that convey state and these can fire more frequently
     * than desired. Aggregating timers allow a bunch of events to be collapsed into one by only firing the last
     * event.
     * @private
     */
    var aggregatingTimers = {};

    /**
     * This function sets a timeout for a function to be called with the feature that if another
     * invocation comes along within a particular interval (with the same key), the second invocation
     * replaces the first. To prevent a continuous stream of events from preventing a callback from ever
     * firing, we'll collapse no more than 20 events.
     * @param {String} key A key used to identify callbacks that should be aggregated.
     * @param {Function} callback The callback to invoke.
     * @param {Number} period The aggregating period in milliseconds.
     * @private
     */
    function addAggregatingTimer(key, callback, period) {
        if( !period) {
            period = 100; // 0.1 second
        }
        var counter = 0;
        if( aggregatingTimers[key]) {
            clearTimeout(aggregatingTimers[key].timer);
            counter = aggregatingTimers[key].counter;
        }
        if( counter > 20) {
            delete aggregatingTimers[key];
            callback();
        }
        else {
            aggregatingTimers[key] = {counter: counter +1};
            aggregatingTimers[key].timer = setTimeout(function () {
                delete aggregatingTimers[key];
                callback();
            }, period);
        }
    }

    /** @private */
    //
    // this function gets called for each room when there is a room update.
    //
    function processOccupantList(roomName, occupantList) {
        var myInfo = null;
        var reducedList = {};

        var id;
        for (id in occupantList) {
            if (occupantList.hasOwnProperty(id)) {
                if (id === self.myEasyrtcid) {
                    myInfo = occupantList[id];
                }
                else {
                    reducedList[id] = occupantList[id];
                }
            }
        }
        //
        // processLostPeers detects peers that have gone away and performs
        // house keeping accordingly.
        //
        processLostPeers(reducedList);
        //
        //
        //
        addAggregatingTimer("roomOccupants&" + roomName, function(){
            if (roomOccupantListener) {
                roomOccupantListener(roomName, reducedList, myInfo);
            }
            self.emitEvent("roomOccupants", {roomName:roomName, occupants:lastLoggedInList});
        }, 100);
    }

    /** @private */
    function onChannelMsg(msg, ackAcceptorFunc) {

        var targeting = {};
        if (ackAcceptorFunc) {
            ackAcceptorFunc(self.ackMessage);
        }
        if (msg.targetEasyrtcid) {
            targeting.targetEasyrtcid = msg.targetEasyrtcid;
        }
        if (msg.targetRoom) {
            targeting.targetRoom = msg.targetRoom;
        }
        if (msg.targetGroup) {
            targeting.targetGroup = msg.targetGroup;
        }
        if (msg.senderEasyrtcid) {
            self.receivePeerDistribute(msg.senderEasyrtcid, msg, targeting);
        }
        else {
            if (receiveServerCB) {
                receiveServerCB(msg.msgType, msg.msgData, targeting);
            }
            else {
                logDebug("Unhandled server message " + JSON.stringify(msg));
            }
        }
    }

    /** @private */
    function processUrl(url) {
        var ipAddress;
        if (url.indexOf('turn:') === 0 || url.indexOf('turns:') === 0) {
            ipAddress = url.split(/[@:&]/g)[1];
            self._turnServers[ipAddress] = true;
        } else if (url.indexOf('stun:') === 0 || url.indexOf('stuns:') === 0) {
            ipAddress = url.split(/[@:&]/g)[1];
            self._stunServers[ipAddress] = true;
        }
    }

    /** @private */
    function processIceConfig(iceConfig) {

        var i, j, item;

        pc_config = {
            iceServers: []
        };

        self._turnServers = {};
        self._stunServers = {};

        if (
            !iceConfig ||
                !iceConfig.iceServers ||
                    typeof iceConfig.iceServers.length === "undefined"
        ) {
            self.showError(
                self.errCodes.DEVELOPER_ERR,
                "iceConfig received from server didn't have an array called iceServers, ignoring it"
            );
        } else {
            pc_config = {
                iceServers: iceConfig.iceServers
            };
        }

        for (i = 0; i < iceConfig.iceServers.length; i++) {
            item = iceConfig.iceServers[i];
            if( item.urls && item.urls.length ) {
               for( j = 0; j < item.urls.length; j++ ) {
                  processUrl(item.urls[j]);
               }
            }
            else if( item.url ) {
               processUrl(item.url);
            }
         }
    }

    /** @private */
    function processSessionData(sessionData) {
        if (sessionData) {
            if (sessionData.easyrtcsid) {
                self.easyrtcsid = sessionData.easyrtcsid;
            }
            if (sessionData.field) {
                sessionFields = sessionData.field;
            }
        }
    }

    /** @private */
    function processRoomData(roomData) {
        self.roomData = roomData;

        var k, roomName,
            stuffToRemove, stuffToAdd,
            id, removeId;

        for (roomName in self.roomData) {
            if (!self.roomData.hasOwnProperty(roomName)) {
                continue;
            }
            if (roomData[roomName].roomStatus === "join") {
                if (!(self.roomJoin[roomName])) {
                    self.roomJoin[roomName] = roomData[roomName];
                }
                var mediaIds = buildMediaIds();
                if (mediaIds !== {}) {
                    self.setRoomApiField(roomName, "mediaIds", mediaIds);
                }
            }
            else if (roomData[roomName].roomStatus === "leave") {
                if (self.roomEntryListener) {
                    self.roomEntryListener(false, roomName);
                }
                delete self.roomJoin[roomName];
                delete lastLoggedInList[roomName];
                continue;
            }

            if (roomData[roomName].clientList) {
                lastLoggedInList[roomName] = roomData[roomName].clientList;
            }
            else if (roomData[roomName].clientListDelta) {
                stuffToAdd = roomData[roomName].clientListDelta.updateClient;
                if (stuffToAdd) {
                    for (id in stuffToAdd) {
                        if (!stuffToAdd.hasOwnProperty(id)) {
                            continue;
                        }
                        if (!lastLoggedInList[roomName]) {
                            lastLoggedInList[roomName] = [];
                        }
                        if( !lastLoggedInList[roomName][id] ) {
                           lastLoggedInList[roomName][id] = stuffToAdd[id];
                        }
                        for( k in stuffToAdd[id] ) {
                           if( k === "apiField" || k === "presence") {
                              lastLoggedInList[roomName][id][k] = stuffToAdd[id][k];
                           }
                        }
                    }
                }
                stuffToRemove = roomData[roomName].clientListDelta.removeClient;
                if (stuffToRemove && lastLoggedInList[roomName]) {
                    for (removeId in stuffToRemove) {
                        if (stuffToRemove.hasOwnProperty(removeId)) {
                            delete lastLoggedInList[roomName][removeId];
                        }
                    }
                }
            }
            if (self.roomJoin[roomName] && roomData[roomName].field) {
                fields.rooms[roomName] = roomData[roomName].field;
            }
            if (roomData[roomName].roomStatus === "join") {
                if (self.roomEntryListener) {
                    self.roomEntryListener(true, roomName);
                }
            }
            processOccupantList(roomName, lastLoggedInList[roomName]);
        }
        self.emitEvent("roomOccupant", lastLoggedInList);
    }

    /** @private */
    function onChannelCmd(msg, ackAcceptorFn) {

        var caller = msg.senderEasyrtcid;
        var msgType = msg.msgType;
        var msgData = msg.msgData;
        var pc;

        logDebug('received message of type ' + msgType);


        if (typeof queuedMessages[caller] === "undefined") {
            clearQueuedMessages(caller);
        }

        var processCandidateBody = function(caller, msgData) {
            var candidate = null;

            if( iceCandidateFilter ) {
               msgData = iceCandidateFilter(msgData, true);
               if( !msgData ) {
                  return;
               }
            }

            candidate = new RTCIceCandidate({
                sdpMLineIndex: msgData.label,
                candidate: msgData.candidate
            });
            pc = peerConns[caller].pc;

            function iceAddSuccess() {
                logDebug("iceAddSuccess: " +
                    JSON.stringify(candidate));
                processCandicate(msgData.candidate);
            }

            function iceAddFailure(domError) {
                self.showError(self.errCodes.ICECANDIDATE_ERR, "bad ice candidate (" + domError.name + "): " +
                    JSON.stringify(candidate));
            }

            pc.addIceCandidate(candidate, iceAddSuccess, iceAddFailure);
        };

        var flushCachedCandidates = function(caller) {
            var i;
            if (queuedMessages[caller]) {
                for (i = 0; i < queuedMessages[caller].candidates.length; i++) {
                    processCandidateBody(caller, queuedMessages[caller].candidates[i]);
                }
                delete queuedMessages[caller];
            }
        };

        var processOffer = function(caller, msgData) {

            var helper = function(wasAccepted, streamNames) {

                if (streamNames) {
                    if (typeof streamNames === "string") {
                        streamNames = [streamNames];
                    }
                    else if (streamNames.length === undefined) {
                        self.showError(self.errCodes.DEVELOPER_ERR, "accept callback passed invalid streamNames");
                        return;
                    }
                }

                logDebug("offer accept=" + wasAccepted);

                delete offersPending[caller];

                if (wasAccepted) {
                    if (!self.supportsPeerConnections()) {
                        self.showError(self.errCodes.CALL_ERR, self.getConstantString("noWebrtcSupport"));
                        return;
                    }
                    doAnswer(caller, msgData, streamNames);
                    flushCachedCandidates(caller);
                }
                else {
                    sendSignalling(caller, "reject", null, null, null);
                    clearQueuedMessages(caller);
                }
            };
            //
            // There is a very rare case of two callers sending each other offers
            // before receiving the others offer. In such a case, the caller with the
            // greater valued easyrtcid will delete its pending call information and do a
            // simple answer to the other caller's offer.
            //
            if (acceptancePending[caller] && caller < self.myEasyrtcid) {
                delete acceptancePending[caller];
                if (queuedMessages[caller]) {
                    delete queuedMessages[caller];
                }
                if (peerConns[caller]) {
                    if (peerConns[caller].wasAcceptedCB) {
                        peerConns[caller].wasAcceptedCB(true, caller);
                    }
                    delete peerConns[caller];
                }
                helper(true);
                return;
            }

            offersPending[caller] = msgData;
            if (!self.acceptCheck) {
                helper(true);
            }
            else {
                self.acceptCheck(caller, helper);
            }
        };

        function processReject(caller) {
            delete acceptancePending[caller];
            if (queuedMessages[caller]) {
                delete queuedMessages[caller];
            }
            if (peerConns[caller]) {
                if (peerConns[caller].wasAcceptedCB) {
                    peerConns[caller].wasAcceptedCB(false, caller);
                }
                delete peerConns[caller];
            }
        }

        function processAnswer(caller, msgData) {

            delete acceptancePending[caller];

            //
            // if we've discarded the peer connection, ignore the answer.
            //
            if (!peerConns[caller]) {
                return;
            }
            peerConns[caller].connectionAccepted = true;



            if (peerConns[caller].wasAcceptedCB) {
                peerConns[caller].wasAcceptedCB(true, caller);
            }

            var onSignalSuccess = function() {

            };
            var onSignalFailure = function(errorCode, errorText) {
                if (peerConns[caller]) {
                    delete peerConns[caller];
                }
                self.showError(errorCode, errorText);
            };
            // peerConns[caller].startedAV = true;
            sendQueuedCandidates(caller, onSignalSuccess, onSignalFailure);
            pc = peerConns[caller].pc;
            var sd = new RTCSessionDescription(msgData);
            if (!sd) {
                throw "Could not create the RTCSessionDescription";
            }

            logDebug("about to call initiating setRemoteDescription");

            try {
                if (sdpRemoteFilter) {
                    sd.sdp = sdpRemoteFilter(sd.sdp);
                }
                pc.setRemoteDescription(sd, function() {
                    if (pc.connectDataConnection) {
                        logDebug("calling connectDataConnection(5001,5002)");

                        pc.connectDataConnection(5001, 5002); // these are like ids for data channels
                    }
                }, function(message){
                     logDebug("setRemoteDescription failed ", message);
                 });
            } catch (smdException) {
                logDebug("setRemoteDescription failed ", smdException);
            }
            flushCachedCandidates(caller);
        }

        function processCandidateQueue(caller, msgData) {

            if (peerConns[caller] && peerConns[caller].pc) {
                processCandidateBody(caller, msgData);
            }
            else {
                if (!peerConns[caller]) {
                    queuedMessages[caller] = {
                        candidates: []
                    };
                }
                queuedMessages[caller].candidates.push(msgData);
            }
        }

        switch (msgType) {
            case "sessionData":
                processSessionData(msgData.sessionData);
                break;
            case "roomData":
                processRoomData(msgData.roomData);
                break;
            case "iceConfig":
                processIceConfig(msgData.iceConfig);
                break;
            case "forwardToUrl":
                if (msgData.newWindow) {
                    window.open(msgData.forwardToUrl.url);
                }
                else {
                    window.location.href = msgData.forwardToUrl.url;
                }
                break;
            case "offer":
                processOffer(caller, msgData);
                break;
            case "reject":
                processReject(caller);
                break;
            case "answer":
                processAnswer(caller, msgData);
                break;
            case "candidate":
                processCandidateQueue(caller, msgData);
                break;
            case "hangup":
                onRemoteHangup(caller);
                clearQueuedMessages(caller);
                break;
            case "error":
                self.showError(msgData.errorCode, msgData.errorText);
                break;
            default:
                self.showError(self.errCodes.DEVELOPER_ERR, "received unknown message type from server, msgType is " + msgType);
                return;
        }

        if (ackAcceptorFn) {
            ackAcceptorFn(self.ackMessage);
        }
    }

    /**
     * Sets the presence state on the server.
     * @param {String} state - one of 'away','chat','dnd','xa'
     * @param {String} statusText - User configurable status string. May be length limited.
     * @example   easyrtc.updatePresence('dnd', 'sleeping');
     */
    this.updatePresence = function(state, statusText) {

        self.presenceShow = state;
        self.presenceStatus = statusText;

        if (self.webSocketConnected) {
            sendSignalling(null, 'setPresence', {
                setPresence: {
                    'show': self.presenceShow,
                    'status': self.presenceStatus
                }
            }, null);
        }
    };

    /**
     * Fetch the collection of session fields as a map. The map has the structure:
     *  {key1: {"fieldName": key1, "fieldValue": value1}, ...,
     *   key2: {"fieldName": key2, "fieldValue": value2}
     *  }
     * @returns {Object}
     */
    this.getSessionFields = function() {
        return sessionFields;
    };

    /**
     * Fetch the value of a session field by name.
     * @param {String} name - name of the session field to be fetched.
     * @returns the field value (which can be anything). Returns undefined if the field does not exist.
     */
    this.getSessionField = function(name) {
        if (sessionFields[name]) {
            return sessionFields[name].fieldValue;
        }
        else {
            return undefined;
        }
    };

    /**
     * Returns an array of easyrtcid's of peers in a particular room.
     * @param roomName
     * @returns {Array} of easyrtcids or null if the client is not in the room.
     * @example
     *     var occupants = easyrtc.getRoomOccupants("default");
     *     var i;
     *     for( i = 0; i < occupants.length; i++ ) {
     *         console.log( occupants[i] + " is in the room");
     *     }
     */
    this.getRoomOccupantsAsArray = function(roomName) {
        if (!lastLoggedInList[roomName]) {
            return null;
        }
        else {
            return Object.keys(lastLoggedInList[roomName]);
        }
    };

    /**
     * Returns a map of easyrtcid's of peers in a particular room. You should only test elements in the map to see if they are
     * null; their actual values are not guaranteed to be the same in different releases.
     * @param roomName
     * @returns {Object} of easyrtcids or null if the client is not in the room.
     * @example
     *      if( easyrtc.getRoomOccupantsAsMap("default")[some_easyrtcid]) {
     *          console.log("yep, " + some_easyrtcid + " is in the room");
     *      }
     */
    this.getRoomOccupantsAsMap = function(roomName) {
        return lastLoggedInList[roomName];
    };

    /**
     * Returns true if the ipAddress parameter was the address of a turn server. This is done by checking against information
     * collected during peer to peer calls. Don't expect it to work before the first call, or to identify turn servers that aren't
     * in the ice config.
     * @param ipAddress
     * @returns {boolean} true if ip address is known to be that of a turn server, false otherwise.
     */
    this.isTurnServer = function(ipAddress) {
        return !!self._turnServers[ipAddress];
    };

    /**
     * Returns true if the ipAddress parameter was the address of a stun server. This is done by checking against information
     * collected during peer to peer calls. Don't expect it to work before the first call, or to identify turn servers that aren't
     * in the ice config.
     * @param {string} ipAddress
     * @returns {boolean} true if ip address is known to be that of a stun server, false otherwise.
     */
    this.isStunServer = function(ipAddress) {
        return !!self._stunServers[ipAddress];
    };

    /**
     * Request fresh ice config information from the server.
     * This should be done periodically by long running applications.
     * @param {Function} callback is called with a value of true on success, false on failure.
     */
    this.getFreshIceConfig = function(callback) {
        var dataToShip = {
            msgType: "getIceConfig",
            msgData: {}
        };
        if (!callback) {
            callback = function() {
            };
        }
        self.webSocket.json.emit("easyrtcCmd", dataToShip,
                function(ackMsg) {
                    if (ackMsg.msgType === "iceConfig") {
                        processIceConfig(ackMsg.msgData.iceConfig);
                        callback(true);
                    }
                    else {
                        self.showError(ackMsg.msgData.errorCode, ackMsg.msgData.errorText);
                        callback(false);
                    }
                }
        );
    };

    /**
     * This method allows you to join a single room. It may be called multiple times to be in
     * multiple rooms simultaneously. It may be called before or after connecting to the server.
     * Note: the successCB and failureDB will only be called if you are already connected to the server.
     * @param {String} roomName the room to be joined.
     * @param {Object} roomParameters application specific parameters, can be null.
     * @param {Function} successCB called once, with a roomName as it's argument, once the room is joined.
     * @param {Function} failureCB called if the room can not be joined. The arguments of failureCB are errorCode, errorText, roomName.
     */
    this.joinRoom = function(roomName, roomParameters, successCB, failureCB) {
        if (self.roomJoin[roomName]) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Attempt to join room " + roomName + " which you are already in.");
            return;
        }

        var newRoomData = {roomName: roomName};
        if (roomParameters) {
            try {
                JSON.stringify(roomParameters);
            } catch (error) {
                self.showError(self.errCodes.DEVELOPER_ERR, "non-jsonable parameter to easyrtc.joinRoom");
                throw "Developer error, see application error messages";
            }
            var parameters = {};
            for (var key in roomParameters) {
                if (roomParameters.hasOwnProperty(key)) {
                    parameters[key] = roomParameters[key];
                }
            }
            newRoomData.roomParameter = parameters;
        }
        var msgData = {
            roomJoin: {}
        };
        var roomData;
        var signallingSuccess, signallingFailure;
        if (self.webSocket) {

            msgData.roomJoin[roomName] = newRoomData;
            signallingSuccess = function(msgType, msgData) {

                roomData = msgData.roomData;
                self.roomJoin[roomName] = newRoomData;
                if (successCB) {
                    successCB(roomName);
                }

                processRoomData(roomData);
            };
            signallingFailure = function(errorCode, errorText) {
                if (failureCB) {
                    failureCB(errorCode, errorText, roomName);
                }
                else {
                    self.showError(errorCode, self.format(self.getConstantString("unableToEnterRoom"), roomName, errorText));
                }
            };
            sendSignalling(null, "roomJoin", msgData, signallingSuccess, signallingFailure);
        }
        else {
            self.roomJoin[roomName] = newRoomData;
        }

    };

    /**
     * This function allows you to leave a single room. Note: the successCB and failureDB
     *  arguments are optional and will only be called if you are already connected to the server.
     * @param {String} roomName
     * @param {Function} successCallback - A function which expects a roomName.
     * @param {Function} failureCallback - A function which expects the following arguments: errorCode, errorText, roomName.
     * @example
     *    easyrtc.leaveRoom("freds_room");
     *    easyrtc.leaveRoom("freds_room", function(roomName){ console.log("left the room")},
     *                       function(errorCode, errorText, roomName){ console.log("left the room")});
     */
    this.leaveRoom = function(roomName, successCallback, failureCallback) {
        var roomItem;
        if (self.roomJoin[roomName]) {
            if (!self.webSocket) {
                delete self.roomJoin[roomName];
            }
            else {
                roomItem = {};
                roomItem[roomName] = {roomName: roomName};
                sendSignalling(null, "roomLeave", {roomLeave: roomItem},
                function(msgType, msgData) {
                    var roomData = msgData.roomData;
                    processRoomData(roomData);
                    if (successCallback) {
                        successCallback(roomName);
                    }
                },
                        function(errorCode, errorText) {
                            if (failureCallback) {
                                failureCallback(errorCode, errorText, roomName);
                            }
                        });
            }
        }
    };

    /** Get a list of the rooms you are in. You must be connected to call this function.
     * @returns {Object} A map whose keys are the room names
     */
    this.getRoomsJoined = function() {
        var roomsIn = {};
        var key;
        for (key in self.roomJoin) {
            if (self.roomJoin.hasOwnProperty(key)) {
                roomsIn[key] = true;
            }
        }
        return roomsIn;
    };

    /** Get server defined fields associated with a particular room. Only valid
     * after a connection has been made.
     * @param {String} roomName - the name of the room you want the fields for.
     * @returns {Object} A dictionary containing entries of the form {key:{'fieldName':key, 'fieldValue':value1}} or undefined
     * if you are not connected to the room.
     */
    this.getRoomFields = function(roomName) {
        return (!fields || !fields.rooms || !fields.rooms[roomName]) ?
                    undefined : fields.rooms[roomName];
    };

    /** Get server defined fields associated with the current application. Only valid
     * after a connection has been made.
     * @returns {Object} A dictionary containing entries of the form {key:{'fieldName':key, 'fieldValue':value1}}
     */
    this.getApplicationFields = function() {
        return fields.application;
    };

    /** Get server defined fields associated with the connection. Only valid
     * after a connection has been made.
     * @returns {Object} A dictionary containing entries of the form {key:{'fieldName':key, 'fieldValue':value1}}
     */
    this.getConnectionFields = function() {
        return fields.connection;
    };

    /**
     * Supply a socket.io connection that will be used instead of allocating a new socket.
     * The expected usage is that you allocate a websocket, assign options to it, call
     * easyrtc.useThisSocketConnection, followed by easyrtc.connect or easyrtc.easyApp. Easyrtc will not attempt to
     * close sockets that were supplied with easyrtc.useThisSocketConnection.
     * @param {Object} alreadyAllocatedSocketIo A value allocated with the connect method of socket.io.
     */
    this.useThisSocketConnection = function(alreadyAllocatedSocketIo) {
        preallocatedSocketIo = alreadyAllocatedSocketIo;
    };

    /** @private */
    function processToken(msg) {
        var msgData = msg.msgData;
        logDebug("entered process token");

        if (msgData.easyrtcid) {
            self.myEasyrtcid = msgData.easyrtcid;
        }
        if (msgData.field) {
            fields.connection = msgData.field;
        }
        if (msgData.iceConfig) {
            processIceConfig(msgData.iceConfig);
        }

        if (msgData.sessionData) {
            processSessionData(msgData.sessionData);
        }
        if (msgData.roomData) {
            processRoomData(msgData.roomData);
        }
        if (msgData.application.field) {
            fields.application = msgData.application.field;
        }
    }

    /** @private */
    function sendAuthenticate(successCallback, errorCallback) {
        //
        // find our easyrtcsid
        //
        var cookies, target, i;
        var easyrtcsid = null;

        if (self.cookieId && document.cookie) {
            cookies = document.cookie.split(/[; ]/g);
            target = self.cookieId + "=";
            for (i = 0; i < cookies.length; i++) {
                if (cookies[i].indexOf(target) === 0) {
                    easyrtcsid = cookies[i].substring(target.length);
                }
            }
        }

        var msgData = {
            apiVersion: self.apiVersion,
            applicationName: self.applicationName,
            setUserCfg: collectConfigurationInfo(true)
        };

        if (!self.roomJoin) {
            self.roomJoin = {};
        }
        if (self.presenceShow) {
            msgData.setPresence = {
                show: self.presenceShow,
                status: self.presenceStatus
            };
        }
        if (self.username) {
            msgData.username = self.username;
        }
        if (self.roomJoin && !isEmptyObj(self.roomJoin)) {
            msgData.roomJoin = self.roomJoin;
        }
        if (easyrtcsid) {
            msgData.easyrtcsid = easyrtcsid;
        }
        if (credential) {
            msgData.credential = credential;
        }

        self.webSocket.json.emit(
            "easyrtcAuth",
            {
                msgType: "authenticate",
                msgData: msgData
            },
            function(msg) {
                var room;
                if (msg.msgType === "error") {
                    errorCallback(msg.msgData.errorCode, msg.msgData.errorText);
                    self.roomJoin = {};
                }
                else {
                    processToken(msg);
                    if (self._roomApiFields) {
                        for (room in self._roomApiFields) {
                            if (self._roomApiFields.hasOwnProperty(room)) {
                                enqueueSendRoomApi(room);
                            }
                        }
                    }

                    if (successCallback) {
                        successCallback(self.myEasyrtcid);
                    }
                }
            }
        );
    }

    /** @private */
    function connectToWSServer(successCallback, errorCallback) {
        var i;
        if (preallocatedSocketIo) {
            self.webSocket = preallocatedSocketIo;
        }
        else if (!self.webSocket) {
            try {
               self.webSocket = io.connect(serverPath, connectionOptions);

                if (!self.webSocket) {
                    throw "io.connect failed";
                }

            } catch(socketErr) {
                self.webSocket = 0;
                errorCallback( self.errCodes.SYSTEM_ERROR, socketErr.toString());

               return;
            }
        }
        else {
            for (i in self.websocketListeners) {
                if (!self.websocketListeners.hasOwnProperty(i)) {
                    continue;
                }
                self.webSocket.removeEventListener(self.websocketListeners[i].event,
                        self.websocketListeners[i].handler);
            }
        }

        self.websocketListeners = [];

        function addSocketListener(event, handler) {
            self.webSocket.on(event, handler);
            self.websocketListeners.push({event: event, handler: handler});
        }

        addSocketListener("close", function(event) {
            logDebug("the web socket closed");
        });

        addSocketListener('error', function(event) {
            function handleErrorEvent() {
                if (self.myEasyrtcid) {
                    //
                    // socket.io version 1 got rid of the socket member, moving everything up one level.
                    //
                    if (isSocketConnected(self.webSocket)) {
                        self.showError(self.errCodes.SIGNAL_ERR, self.getConstantString("miscSignalError"));
                    }
                    else {
                        /* socket server went down. this will generate a 'disconnect' event as well, so skip this event */
                        errorCallback(self.errCodes.CONNECT_ERR, self.getConstantString("noServer"));
                    }
                }
                else {
                    errorCallback(self.errCodes.CONNECT_ERR, self.getConstantString("noServer"));
                }
            }
            handleErrorEvent();
        });

        function connectHandler(event) {
            self.webSocketConnected = true;
            if (!self.webSocket) {
                self.showError(self.errCodes.CONNECT_ERR, self.getConstantString("badsocket"));
            }

            logDebug("saw socket-server onconnect event");

            if (self.webSocketConnected) {
                sendAuthenticate(successCallback, errorCallback);
            }
            else {
                errorCallback(self.errCodes.SIGNAL_ERR, self.getConstantString("icf"));
            }
        }

        if (isSocketConnected(preallocatedSocketIo)) {
            connectHandler(null);
        }
        else {
            addSocketListener("connect", connectHandler);
        }

        addSocketListener("easyrtcMsg", onChannelMsg);
        addSocketListener("easyrtcCmd", onChannelCmd);
        addSocketListener("disconnect", function(/* code, reason, wasClean */) {

            self.webSocketConnected = false;
            updateConfigurationInfo = function() {}; // dummy update function
            oldConfig = {};
            disconnectBody();

            if (self.disconnectListener) {
                self.disconnectListener();
            }
        });
    }

    /**
     * Connects to the EasyRTC signaling server. You must connect before trying to
     * call other users.
     * @param {String} applicationName is a string that identifies the application so that different applications can have different
     *        lists of users. Note that the server configuration specifies a regular expression that is used to check application names
     *        for validity. The default pattern is that of an identifier, spaces are not allowed.
     * @param {Function} successCallback (easyrtcId, roomOwner) - is called on successful connect. easyrtcId is the
     *   unique name that the client is known to the server by. A client usually only needs it's own easyrtcId for debugging purposes.
     *       roomOwner is true if the user is the owner of a room. It's value is random if the user is in multiple rooms.
     * @param {Function} errorCallback (errorCode, errorText) - is called on unsuccessful connect. if null, an alert is called instead.
     *  The errorCode takes it's value from easyrtc.errCodes.
     * @example
     *   easyrtc.connect("my_chat_app",
     *                   function(easyrtcid, roomOwner){
     *                       if( roomOwner){ console.log("I'm the room owner"); }
     *                       console.log("my id is " + easyrtcid);
     *                   },
     *                   function(errorText){
     *                       console.log("failed to connect ", erFrText);
     *                   });
     */
    this.connect = function(applicationName, successCallback, errorCallback) {

        // Detect invalid or missing socket.io
        if (!io) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Your HTML has not included the socket.io.js library");
        }

        if (!preallocatedSocketIo && self.webSocket) {
            self.showError(self.errCodes.DEVELOPER_ERR, "Attempt to connect when already connected to socket server");
            return;
        }
        pc_config = {};
        closedChannel = null;
        oldConfig = {}; // used internally by updateConfiguration
        queuedMessages = {};
        self.applicationName = applicationName;
        fields = {
            rooms: {},
            application: {},
            connection: {}
        };

        logDebug("attempt to connect to WebRTC signalling server with application name=" + applicationName);

        if (errorCallback === null) {
            errorCallback = function(errorCode, errorText) {
                self.showError(errorCode, errorText);
            };
        }

        connectToWSServer(successCallback, errorCallback);
    };
};

return new Easyrtc();

}));

/* global define, module, require, console */
/*!
  Script: easyrtc_app.js

    Provides support file and data transfer support to easyrtc.

  About: License

    Copyright (c) 2016, Priologic Software Inc.
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright notice,
          this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
    CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
    INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
    POSSIBILITY OF SUCH DAMAGE.
*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //RequireJS (AMD) build system
        define('easyrtc_app',['easyrtc'], factory);
    } else if (typeof module === 'object' && module.exports) {
        //CommonJS build system
        module.exports = factory(require('easyrtc'));
    } else {
        //Vanilla JS, ensure dependencies are loaded correctly
        if (typeof window.easyrtc !== 'object' || !window.easyrtc) {
            throw new Error("easyrtc_app requires easyrtc");
        }
        root.easyrtc = factory(window.easyrtc);
  }
}(this, function (easyrtc, undefined) {

    "use strict";

    /**
     * This file adds additional methods to Easyrtc for simplifying the
     * management of video-mediastream assignment.
     * @class Easyrtc_App
     */

    /** @private */
    var autoAddCloseButtons = true;

    /** By default, the easyApp routine sticks a "close" button on top of each caller
     * video object that it manages. Call this function(before calling easyApp) to disable that particular feature.
     * @function
     * @memberOf Easyrtc_App
     * @example
     *    easyrtc.dontAddCloseButtons();
     */
    easyrtc.dontAddCloseButtons = function() {
        autoAddCloseButtons = false;
    };

    /**
     * This is a helper function for the easyApp method. It manages the assignment of video streams
     * to video objects. It assumes
     * @param {String} monitorVideoId is the id of the mirror video tag.
     * @param {Array} videoIds is an array of ids of the caller video tags.
     * @private
     */
    function easyAppBody(monitorVideoId, videoIds) {

        var videoIdsP = videoIds || [],
            numPEOPLE = videoIds.length,
            videoIdToCallerMap = {},
            onCall = null,
            onHangup = null;

        /**
         * Validates that the video ids correspond to dom objects.
         * @param {String} monitorVideoId
         * @param {Array} videoIds
         * @returns {Boolean}
         * @private
         */
        function validateVideoIds(monitorVideoId, videoIds) {
            var i;
            // verify that video ids were not typos.
            if (monitorVideoId && !document.getElementById(monitorVideoId)) {
                easyrtc.showError(easyrtc.errCodes.DEVELOPER_ERR, "The monitor video id passed to easyApp was bad, saw " + monitorVideoId);
                return false;
            }

            for (i in videoIds) {
                if (!videoIds.hasOwnProperty(i)) {
                    continue;
                }
                var name = videoIds[i];
                if (!document.getElementById(name)) {
                    easyrtc.showError(easyrtc.errCodes.DEVELOPER_ERR, "The caller video id '" + name + "' passed to easyApp was bad.");
                    return false;
                }
            }
            return true;
        }


        function getCallerOfVideo(videoObject) {
            return videoIdToCallerMap[videoObject.id];
        }

        function setCallerOfVideo(videoObject, callerEasyrtcId) {
            videoIdToCallerMap[videoObject.id] = callerEasyrtcId;
        }

        function videoIsFree(obj) {
            var caller = getCallerOfVideo(obj);
            return (caller === "" || caller === null || caller === undefined);
        }

        function getIthVideo(i) {
            if (videoIdsP[i]) {
                return document.getElementById(videoIdsP[i]);
            }
            else {
                return null;
            }
        }

        function showVideo(video, stream) {
            easyrtc.setVideoObjectSrc(video, stream);
            if (video.style.visibility) {
                video.style.visibility = 'visible';
            }
        }

        function hideVideo(video) {
            easyrtc.setVideoObjectSrc(video, "");
            video.style.visibility = "hidden";
        }

        if (!validateVideoIds(monitorVideoId, videoIdsP)) {
            throw "bad video element id";
        }

        if (monitorVideoId) {
            document.getElementById(monitorVideoId).muted = "muted";
        }

        easyrtc.addEventListener("roomOccupants",
            function(eventName, eventData) {
                var i;
                for (i = 0; i < numPEOPLE; i++) {
                    var video = getIthVideo(i);
                    if (!videoIsFree(video)) {
                if( !easyrtc.isPeerInAnyRoom(getCallerOfVideo(video))){
                           if( onHangup ) {
                               onHangup(getCallerOfVideo(video), i);
                           }
                           setCallerOfVideo(video, null);
                        }
                    }
                }
            }
        );

        /** Sets an event handler that gets called when an incoming MediaStream is assigned
         * to a video object. The name is poorly chosen and reflects a simpler era when you could
         * only have one media stream per peer connection.
         * @function
         * @memberOf Easyrtc_App
         * @param {Function} cb has the signature function(easyrtcid, slot){}
         * @example
         *   easyrtc.setOnCall( function(easyrtcid, slot){
         *      console.log("call with " + easyrtcid + "established");
         *   });
         */
        easyrtc.setOnCall = function(cb) {
            onCall = cb;
        };

        /** Sets an event handler that gets called when a call is ended.
         * it's only purpose (so far) is to support transitions on video elements.
         x     * this function is only defined after easyrtc.easyApp is called.
         * The slot is parameter is the index into the array of video ids.
         * Note: if you call easyrtc.getConnectionCount() from inside your callback
         * it's count will reflect the number of connections before the hangup started.
         * @function
         * @memberOf Easyrtc_App
         * @param {Function} cb has the signature function(easyrtcid, slot){}
         * @example
         *   easyrtc.setOnHangup( function(easyrtcid, slot){
         *      console.log("call with " + easyrtcid + "ended");
         *   });
         */
        easyrtc.setOnHangup = function(cb) {
            onHangup = cb;
        };

        /**
          * Get the easyrtcid of the ith caller, starting at 0.
          * @function
          * @memberOf Easyrtc_App
          * @param {number} i
          * @returns {String}
          */
        easyrtc.getIthCaller = function(i) {
            if (i < 0 || i >= videoIdsP.length) {
                return null;
            }
            var vid = getIthVideo(i);
            return getCallerOfVideo(vid);
        };

        /**
          * This is the complement of getIthCaller. Given an easyrtcid,
          * it determines which slot the easyrtc is in.
          * @function
          * @memberOf Easyrtc_App
          * @param {string} easyrtcid
          * @returns {number} or -1 if the easyrtcid is not a caller.
          */
        easyrtc.getSlotOfCaller = function(easyrtcid) {
            var i;
            for (i = 0; i < numPEOPLE; i++) {
                if (easyrtc.getIthCaller(i) === easyrtcid) {
                    return i;
                }
            }
            return -1; // caller not connected
        };

        easyrtc.setOnStreamClosed(function(caller) {
            var i;
            for (i = 0; i < numPEOPLE; i++) {
                var video = getIthVideo(i);
                if (getCallerOfVideo(video) === caller) {
                    hideVideo(video);
                    setCallerOfVideo(video, "");
                    if (onHangup) {
                        onHangup(caller, i);
                    }
                }
            }
        });

        //
        // Only accept incoming calls if we have a free video object to display
        // them in.
        //
        easyrtc.setAcceptChecker(function(caller, helper) {
            var i;
            for (i = 0; i < numPEOPLE; i++) {
                var video = getIthVideo(i);
                if (videoIsFree(video)) {
                    helper(true);
                    return;
                }
            }
            helper(false);
        });

        easyrtc.setStreamAcceptor(function(caller, stream) {
            var i;
            if (easyrtc.debugPrinter) {
                easyrtc.debugPrinter("stream acceptor called");
            }

            var video;

            for (i = 0; i < numPEOPLE; i++) {
                video = getIthVideo(i);
                if (getCallerOfVideo(video) === caller) {
                    showVideo(video, stream);
                    if (onCall) {
                        onCall(caller, i);
                    }
                    return;
                }
            }

            for (i = 0; i < numPEOPLE; i++) {
                video = getIthVideo(i);
                if (videoIsFree(video)) {
                    setCallerOfVideo(video, caller);
                    if (onCall) {
                        onCall(caller, i);
                    }
                    showVideo(video, stream);
                    return;
                }
            }
            //
            // no empty slots, so drop whatever caller we have in the first slot and use that one.
            //
            video = getIthVideo(0);
            if (video) {
                easyrtc.hangup(getCallerOfVideo(video));
                showVideo(video, stream);
                if (onCall) {
                    onCall(caller, 0);
                }
            }

            setCallerOfVideo(video, caller);
        });

        var addControls, parentDiv, closeButton, i;
        if (autoAddCloseButtons) {

            addControls = function(video) {
                parentDiv = video.parentNode;
                setCallerOfVideo(video, "");
                closeButton = document.createElement("div");
                closeButton.className = "easyrtc_closeButton";
                closeButton.onclick = function() {
                    if (getCallerOfVideo(video)) {
                        easyrtc.hangup(getCallerOfVideo(video));
                        hideVideo(video);
                        setCallerOfVideo(video, "");
                    }
                };
                parentDiv.appendChild(closeButton);
            };

            for (i = 0; i < numPEOPLE; i++) {
                addControls(getIthVideo(i));
            }
        }

        var monitorVideo = null;
        if (easyrtc.videoEnabled && monitorVideoId !== null) {
            monitorVideo = document.getElementById(monitorVideoId);
            if (!monitorVideo) {
                console.error("Programmer error: no object called " + monitorVideoId);
                return;
            }
            monitorVideo.muted = "muted";
            monitorVideo.defaultMuted = true;
        }
    }

    /**
     * Provides a layer on top of the easyrtc.initMediaSource and easyrtc.connect, assign the local media stream to
     * the video object identified by monitorVideoId, assign remote video streams to
     * the video objects identified by videoIds, and then call onReady. One of it's
     * side effects is to add hangup buttons to the remote video objects, buttons
     * that only appear when you hover over them with the mouse cursor. This method will also add the
     * easyrtcMirror class to the monitor video object so that it behaves like a mirror.
     * @function
     * @memberOf Easyrtc_App
     *  @param {String} applicationName - name of the application.
     *  @param {String} monitorVideoId - the id of the video object used for monitoring the local stream.
     *  @param {Array} videoIds - an array of video object ids (strings)
     *  @param {Function} onReady - a callback function used on success. It is called with the easyrtcId this peer is known to the server as.
     *  @param {Function} onFailure - a callback function used on failure (failed to get local media or a connection of the signaling server).
     *  @example
     *     easyrtc.easyApp('multiChat', 'selfVideo', ['remote1', 'remote2', 'remote3'],
     *              function(easyrtcId){
     *                  console.log("successfully connected, I am " + easyrtcId);
     *              },
     *              function(errorCode, errorText){
     *                  console.log(errorText);
     *              });
     */
    easyrtc.easyApp = function(applicationName, monitorVideoId, videoIds, onReady, onFailure) {

        var gotMediaCallback = null,
            gotConnectionCallback = null;

        easyAppBody(monitorVideoId, videoIds);

        easyrtc.setGotMedia = function(gotMediaCB) {
            gotMediaCallback = gotMediaCB;
        };

        //
        // try to restablish broken connections that weren't caused by a hangup
        //
        easyrtc.setPeerClosedListener( function(easyrtcid) {
           setTimeout( function() {
               if( easyrtc.getSlotOfCaller(easyrtcid)  >= 0 && easyrtc.isPeerInAnyRoom(easyrtcid)) {
                    easyrtc.call(easyrtcid, function(){}, function() {}, function(){});
               }
           }, 1000);
        });

        /** Sets an event handler that gets called when a connection to the signaling
         * server has or has not been made. Can only be called after calling easyrtc.easyApp.
         * @function
         * @memberOf Easyrtc_App
         * @param {Function} gotConnectionCB has the signature (gotConnection, errorText)
         * @example
         *    easyrtc.setGotConnection( function(gotConnection, errorText){
         *        if( gotConnection ){
         *            console.log("Successfully connected to signaling server");
         *        }
         *        else{
         *            console.log("Failed to connect to signaling server because: " + errorText);
         *        }
         *    });
         */
        easyrtc.setGotConnection = function(gotConnectionCB) {
            gotConnectionCallback = gotConnectionCB;
        };

        function nextInitializationStep(/* token */) {
            if (gotConnectionCallback) {
                gotConnectionCallback(true, "");
            }
            onReady(easyrtc.myEasyrtcid);
        }

        function postGetUserMedia() {
            if (gotMediaCallback) {
                gotMediaCallback(true, null);
            }
            if (monitorVideoId !== null) {
                easyrtc.setVideoObjectSrc(document.getElementById(monitorVideoId), easyrtc.getLocalStream());
            }
            function connectError(errorCode, errorText) {
                if (gotConnectionCallback) {
                    gotConnectionCallback(false, errorText);
                }
                else if (onFailure) {
                    onFailure(easyrtc.errCodes.CONNECT_ERR, errorText);
                }
                else {
                    easyrtc.showError(easyrtc.errCodes.CONNECT_ERR, errorText);
                }
            }

            easyrtc.connect(applicationName, nextInitializationStep, connectError);
        }

        var stream = easyrtc.getLocalStream(null);
        if (stream) {
            postGetUserMedia();
        }
        else {
            easyrtc.initMediaSource(
                    postGetUserMedia,
                    function(errorCode, errorText) {
                        if (gotMediaCallback) {
                            gotMediaCallback(false, errorText);
                        }
                        else if (onFailure) {
                            onFailure(easyrtc.errCodes.MEDIA_ERR, errorText);
                        }
                        else {
                            easyrtc.showError(easyrtc.errCodes.MEDIA_ERR, errorText);
                        }
                    },
                    null // default stream
                );
        }
    };

return easyrtc;

})); // end of module wrapper
;