/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Using the setup by Chris Hjorth from http://www.chrishjorth.com and Roman Zhovnirchyk from http://rmn.im/.
 */

var jqmReady = $.Deferred();
var pgReady = $.Deferred();

var app = {

	callback: null,

	// Application Constructor
	initialize: function(callback) {
		//the following might be necessary for iOS
		//window.localStorage.clear();

		this.callback = callback;

      var browser = document.URL.match(/^https?:/);
      if(browser) {
         console.log("Is web.");
         //In case of web we ignore PG but resolve the Deferred Object to trigger initialization
	 		pgReady.resolve();
      }
      else {
         console.log("Is not web.");
	 		this.bindEvents();
      }
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function() {
		document.addEventListener('deviceready', this.onDeviceReady, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		console.log("Device ready event received. Only now is e.g. device.* available");
		if(window && window.device) {
			if(window.device.platform == 'iOS' && parseFloat(window.device.version) >= 7.0) {
				$('body').addClass('phonegap-ios-7');
			}
		}
		app.receivedEvent('deviceready');
	},

	// Update DOM on a Received Event
	receivedEvent: function(event) {
      switch(event) {
         case 'deviceready':

	    		pgReady.resolve();
	    		break;
      }
	}
};

$(document).on("pageinit", function(event, ui) {
   jqmReady.resolve();
});


/**
 * General initialization.
 */
$.when(jqmReady, pgReady).then(function() {
   //Initialization code here
   console.log("Start app.");
   if(app.callback) {
      app.callback();
   }
   console.log("Frameworks ready.");
});
