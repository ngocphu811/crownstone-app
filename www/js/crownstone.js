Object.size = function(obj) {
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
};

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined' ? args[number] : match ;
		});
	};
}

var TTL = 2000; // time-to-live for RSSI values in localisation, 2 seconds
var MAX_HISTORY = 100; // number of rssi values kept in history per device to average

var DEBUG = true; // enable debug, some UI elements are only shown if DEBUG is set to true


var ble;

var crownstone = {

	// array with info of partners (and ourselves), like address, logo, description, etc.
	partnersById: {},

	// map of crownstones
	crownstones: {},

		// map of crownstones under question
	underQuestion: {},

		// map of crownstones not supporting indoor localisation
	blacklist: {},

		// structure to collect crownstones in a building (per floor)
	building: {},

		// store the device which is currently closest
	closestCrownstone : {},

		// store the device wich has wifi in its name
	wifiCrownstone : {},

	mobilePlatform: false,

	/* Start should be called if all plugins are ready and all functionality can be called.
	*/
	start:function() {
		console.log("Start Crownstone application");

		// creates BLE object, does nothing with it yet
		ble = new bluenet.BleExt();

		// set up bluetooth connection
		console.log("Initialize ble");
		ble.init(
			function() {
				$('#findCrownstones').prop("disabled", false);
				$('#localizeBtn').prop("disabled", false);
				$('#searchFloorBtn').prop("disabled", false);
				$('#rcTogglePower').prop("disabled", false);
				$('#hocBinaryBtn').prop("disabled", false);
			}
		);

		//$("#hubPage").pagecontainer( "change");

		$(':mobile-pagecontainer').pagecontainer('change', '#selectionPage', {
			allowSamePageTransition: true,
			transition: 'pop',
			changeHash: false, // do not save in history
			reverse: true,
			showLoadMsg: true
		});

		//$.mobile.changePage("#hotOrColdPage", {transition:'slide', hashChange:true});
	},

	create:function() {
		var self = this;

		console.log("Create Crownstone application");

		var repeatFunctionHandle = null;

		// if debug is disabled, hide everything with class debug
		if (!DEBUG) {
			$(".debug").hide();
		}

		// $.ajaxSetup({ cache: false });

		// start = function() {
		//  console.log("Go to first page");
		//  $.mobile.changePage("#controlPage", {transition:'slide', hashChange:true});
		// }

		// very important statement to make swiping work:
		// https://stackoverflow.com/questions/12838443/swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		//document.ontouchmove = function(event) {
		//         event.preventDefault();
		//};

		var powerStateOn = false;
		var searching = false;
		var connected = false;
		var connecting = false;
		var tracking = false;

		var floorsearching = false;
		var localizing = false;

		var settingsShown = false;

		var connectedDeviceAddress = "";

		var configuration = {};
		var configurationLoaded = false;

		var hubIP= "";

		start = function() {
			console.log("Set side menu event handlers, swipe gestures, etc.");

			self.mobilePlatform = !document.URL.match(/^https?:/);
			if (!self.mobilePlatform) {
				console.log("Do not load BLE, we're in a browser");
			}

			// set up bluetooth connection
			//ble.init(function(enabled) {
			//  $('#findCrownstones').prop("disabled", !enabled);
			//});

			// add menu options to side menu that opens up at swiping
			$('.sideMenu ul').append('<li><a href="#selectionPage">Overview</a></li>');
			$('.sideMenu ul').append('<li><a href="#indoorLocalizationPage">Localization</a></li>');
			$('.sideMenu ul').append('<li><a href="#remoteControlPage">Remote Control</a></li>');
			$('.sideMenu ul').append('<li><a href="#hotOrColdPage">Hot or Cold</a></li>');
			$('.sideMenu ul').append('<li><a href="#webrtcPage">Webrtc</a></li>');
			$('.sideMenu ul').append('<li><a href="#hubPage">Hub</a></li>');
			$('.sideMenu ul').append('<li><a href="#aboutPage">About</a></li>');

			// add swipe gesture to all pages with a panel
			console.log("Add swipe gesture to all pages with side panel");
			$(document).delegate('[data-role="page"]', 'pageinit', function () {
				console.log("Yes, add swipe gesture");
				//check for a `data-role="panel"` element to add swiperight action to
				var $panel = $(this).children('[data-role="panel"]');
				if ($panel.length) {
					$(this).on('swiperight', function(event) {
						$panel.panel("open");
					});
				}
			});

			//          $.ajaxSetup({
			//              "error": function() {
			//                  console.log("General error with one of the ajax calls");
			//              }
			//          });

		}


		/*******************************************************************************************************
		 * Remote Control
		 ******************************************************************************************************/

		$('#remoteControlPage').on('pagecreate', function(event) {
			console.log("create remote control page");

			$('#rcTogglePower').on('click', function(event) {
				$('#switchedCrownstone').html("Switched Crownstone: <b>" + self.closestCrownstone.name + "</b>");
				console.log("Switched crownstone: " + self.closestCrownstone.name);

				ble.connectAndTogglePower(
					self.closestCrownstone,
					function() {
						self.switchedCrownstone = self.closestCrownstone;
						$('#feedback').show();
					}
				);
			});

			$('#fbYes').on('click', function() {
				console.log('got the right one!!!');
				for (var addr in self.crownstones) {
					self.crownstones[addr].ignore = false;
				}
				$('#feedback').hide();
			});

			$('#fbNo').on('click', function() {
				console.log("addr: " + self.closestCrownstone.address);
				self.crownstones[self.closestCrownstone.address].ignore = true;

				ble.connectAndTogglePower(
					self.closestCrownstone,
					function() {
						self.switchedCrownstone = self.closestCrownstone;
						$('#rcTogglePower').trigger('click');
					}
				);

			});
		});

		//connectAndTogglePower = function(address, successCB, errorCB) {
			//console.log("Connect and toggle power");
			//connectAndDiscover(
					//address,
					//POWER_SERVICE_UUID,
					//CHAR_PWM_UUID,
					//function() {//success
						//function callback() {
							//disconnect();
							//if (successCB) successCB();
						//}

						//getPWM(function(value) {
							//if (value == 0) {
								//powerON(callback);
							//} else {
								//powerOFF(callback);
							//}
						//});
					//},
					//function(msg) {//error
						//console.log("failed to connect");
						//if (errorCB) errorCB();
					//}
			//);
		//}

		$('#remoteControlPage').on("pageshow", function(event) {

			resetCrownstoneList();
			findCrownstones(function(obj) {
				updateCrownstoneList(obj, 100);

				showCrownstones();
			});
		});

		/* Function that populates all .rcCrownstoneTable divs.
		*/
		showCrownstones = function() {
			var options = {
				valueNames: ['mac', 'rssi', 'avgRSSI']
			}

			var r = new Array(), j = -1;

			r[++j] = '<thead>';
			r[++j] = '<col style="width: 60%">';
			r[++j] = '<col style="width: 20%">';
			r[++j] = '<col style="width: 20%">';
			r[++j] = '<tr><th align="left">MAC</th><th align="left">RSSI</th><th align="left">AVG</th></tr>';
			r[++j] = '</thead><tbody class="list">';

			var nr = 0;
			for (var el in self.crownstones) {
				r[++j] ='<tr><td class="mac">';
				r[++j] = self.crownstones[el]['name'] + '<br/>' + el;
				r[++j] = '</td><td class="rssi">';
				r[++j] = self.crownstones[el]['rssi'];
				r[++j] = '</td><td class="avgRSSI">';
				r[++j] = Math.floor(self.crownstones[el]['avgRSSI']);
				r[++j] = '</td></tr>';
			}
			r[++j] = '</tbody>';

			$('.rcCrownstoneTable').show();
			$('.rcCrownstoneTable').html(r.join(''));

			// order the table in a descending order (highest RSSI at the top)
			//new List('rcCrownstoneTable', options).sort('avgRSSI', { order: "desc"});

			$('.rcClosestCrownstone').html("Closest Crownstone: <b>" + self.closestCrownstone.name + "</b>");
		};

		$('#remoteControlPage').on("pagehide", function(event) {
			stopSearch();
		});



		/*******************************************************************************************************
		 * Hub
		 ******************************************************************************************************/

		console.log("Create page");

		// TODO: on('pagecreate') doesn't end up here!!!
		$('#hubPage').on('pagecreate', function(event) {

			console.log("Create hub page");

			console.log("Add event handler to button to send wifi info");

			// add event handler to send wifi config to crownstone
			$('#wifiBtn').on('click', function(event) {
				if (self.wifiCrownstone.name) {
					console.log("Send information to: " + self.wifiCrownstone.name);
					var wifiSSID = $('#wifiSSID').val();
					var wifiPassword = $('#wifiPassword').val();
					if(searching) {
						searching=false;
						stopSearch();
					}
					if (wifiSSID == '') {
						console.error("A wifi SSID should be set");
					} else if ((wifiSSID.length > 32) || (wifiPassword.length > 32)) {
						console.error("Wifi or password length larger than 32 bytes");
					} else {
						var string = '{"ssid":"' + wifiSSID + '", "key":"' + wifiPassword + '"}';
						//var string = '{"ssid":"' + wifiSSID + '"}';
						console.log("Set wifi: " + string);
						setWifi(string);
					}
				} else {
					console.error("There is no wifi crownstone available");
					navigator.notification.alert("couldn't find a crownstone with \"wifi\" in its name", null , "no wifi Crownstone");
				}
			});

			// add event handler to read IP from crownstone
			$('#IPBtn').on('click', function(event) {
				if (hubIP!="") {
					var message = "The IP of the hub is: " + hubIP;
					navigator.notification.alert(message, null , "hub IP");
				} else {
					if (self.wifiCrownstone.name) {
						console.log("accessing IP....");
						readIP();
					} else {
						console.error("There is no wifi crownstone available");
						navigator.notification.alert("couldn't find a crownstone with \"wifi\" in its name", null , "no wifi Crownstone");
					}
				}
			});

			$('#scanWifiDevices').on('click', function(event) {
				if (!searching) {
					console.log("Start scanning for devices");
					$('#scanWifiDevices').html('Stop scanning');

					searching = true;
					// TODO: do we need to reset the list?
					resetCrownstoneList();

					// drop out if there is no BLE
					if (!self.mobilePlatform) {
						console.error("Do not start to find the hub. We're not a mobile device.");
						return;
					}

					// Find closest crownstone to connect with
					console.log("Try to find some crownstones");
					findCrownstones(function(obj) {
						console.log("Found indeed some crownstones, update the list");
						updateCrownstoneList(obj, 100);
						showCrownstones();
						$('.rcWifiCrownstone').html("Wifi Crownstone: <b>" + self.wifiCrownstone.name + "</b>");
					});

				} else {
					console.log("Stop scanning for devices");
					stopSearch();
					$('#scanWifiDevices').html('Scan');
					searching = false;
				}
			});
		});

		/*
		$('#hubPage').on('pageshow', function(event) {
			console.log("Show hub page");
			// TODO: do we need to reset the list?
			resetCrownstoneList();

			// drop out if there is no BLE
			if (!self.mobilePlatform) {
				console.error("Do not start to find the hub. We're not a mobile device.");
				return;
			}

			// Find closest crownstone to connect with
			console.log("Try to find some crownstones");
			findCrownstones(function(obj) {
				console.log("Found indeed some crownstones, update the list");
				updateCrownstoneList(obj, 100);
				showCrownstones();
			});

		});
		*/

		setWifi = function(value) {
			ble.connectAndWriteWifi(
				self.wifiCrownstone.address,
				value,
				onWrittenWifi,
				function() {
					console.error("Mistake in writing wifi config");
				}
			);

			function onWrittenWifi() {
				console.log("Written wifi config successfully");
				navigator.notification.activityStart("Please wait" , "connecting the hub to WiFi, it may take a few minutes...");
				setTimeout(readIP, 10000);
			}
		}

		readIP = function() {
			ble.connectAndReadIp(
				self.wifiCrownstone.address,
				function (configuration) {
					navigator.notification.activityStop();
					var message = "The IP of the hub is: " + hubIP;
					console.log("hubIP: " + hubIP);
					if (hubIP=="") {
						hubIP=bluetoothle.bytesToString(configuration.payload);
						console.log("hubIP: " + hubIP);
						if (configuration.length > 15) {
							// Hub didn't read the wifi settings, so we read the wifi settings
							message = "The hub couldn't access the crownstone. Please make sure the crownstone name contains \"wifi\" and the hub is powered on";
						}
						else if (configuration.length < 7) {
							// Hub did read the wifi settings, but couldn't connect and thus set an empty string as ip
							message = "Couldn't connect to WiFi. Please make sure the informations provided are correct";
						}
						else message= "The IP of the hub is: " + hubIP;
					}
					navigator.notification.alert(message, null , "hub IP");
				},
				function() {
					navigator.notification.activityStop();
					console.log("Couldn't read IP");
				}
			);
		}


		/*******************************************************************************************************
		 * Hot or Cold
		 ******************************************************************************************************/


		// CONSTANT
		var MIN_RSSI = -55;
		var MAX_RSSI = -100;

		// VARIABLE
		var binary = false;
		var rgb = "rgb(0,0,0)";

		$('#hotOrColdPage').on("pagecreate", function(event) {
			console.log("Create hot or cold page");
			$('#hocBinaryBtn').on('click', function(event) {
				if (binary) {
					$('#hocBinaryBtn').html('Binary');
					$('#hocBinaryThresholdForm').hide();
					binary = false;
				} else {
					$('#hocBinaryBtn').html('Gradual');
					$('#hocBinaryThresholdForm').show();
					binary = true;
				}
			});

			$('#hocBinaryThreshold').val(-65);
		});

		/* TODO: Do we need an entire new table here? Or can we use showCrownstones again? Is there something special about
		 * the formatting? Then a .css identifier as argument to showCrownstones is enough.
		 */
		$('#hotOrColdPage').on("pageshow", function(event) {

			resetCrownstoneList();
			findCrownstones(function(obj) {
				updateCrownstoneList(obj, 10);

				var options = {
					valueNames: ['mac', 'rssi', 'avgRSSI']
				}

				var r = new Array(), j = -1;

				r[++j] = '<thead>';
				r[++j] = '<col style="width: 60%">';
				r[++j] = '<col style="width: 20%">';
				r[++j] = '<col style="width: 20%">';
				r[++j] = '<tr><th align="left">MAC</th><th align="left">RSSI</th><th align="left">AVG</th></tr>';
				r[++j] = '</thead><tbody class="list">';

				var nr = 0;
				for (var el in self.crownstones) {
					r[++j] ='<tr><td class="mac">';
					r[++j] = self.crownstones[el]['name'] + '<br/>' + el;
					r[++j] = '</td><td class="rssi">';
					r[++j] = self.crownstones[el]['rssi'];
					r[++j] = '</td><td class="avgRSSI">';
					r[++j] = Math.floor(self.crownstones[el]['avgRSSI']);
					r[++j] = '</td></tr>';
				}
				r[++j] = '</tbody>';

				$('#hocCrownstoneTable').show();
				$('#hocCrownstoneTable').html(r.join(''));

				// order the table in a descending order (highest RSSI at the top)
				new List('hocCrownstoneTable', options).sort('avgRSSI', { order: "desc"});

				$('#hocClosestCrownstone').html("Closest Crownstone: <b>" + self.closestCrownstone.name + "</b>");

				updateScreen();
			});
		});

		$('#hotOrColdPage').on("pagehide", function(event) {
			stopSearch();
		});

		updateScreen = function() {

			// if (self.closestCrownstone.avgRSSI > MIN_RSSI) {
			//  MIN_RSSI = self.closestCrownstone.avgRSSI;
			// }

			if (binary) {
				if (self.closestCrownstone.avgRSSI > $('#hocBinaryThreshold').val()) {
					rgb = "rgb(255,0,0)";
				} else {
					rgb = "rgb(0,0,255)";
				}
			} else {
				// console.log("rssi: " + self.closestCrownstone.avgRSSI);
				var perc = Math.abs((self.closestCrownstone.avgRSSI - MIN_RSSI) / (MAX_RSSI - MIN_RSSI));
				// console.log("perc: " + perc)
				var red = Math.floor(Math.max(Math.min(255, (1-perc) * 255), 0));
				var blue = Math.floor(Math.max(Math.min(255, perc * 255), 0));

				rgb = "rgb({0},{1},{2})".format(red, 0, blue);
			}
			// console.log("rgb: " + rgb);
			$('#hotOrColdPage').css("backgroundColor", rgb);

			if (self.closestCrownstone.avgRSSI > MIN_RSSI - 10) {
				$('#hocFoundCrownstone').html("<b>" + self.closestCrownstone.name + "</b>");
				if (!$('#hocFoundCrownstone').is(':visible')) {
					$('#hocFoundCrownstone').show();
				}
			} else {
				$('#hocFoundCrownstone').hide();
			}
		}


		/*******************************************************************************************************
		 * Selection page
		 ******************************************************************************************************/


		$("#selectionPage").on("pagecreate", function(event) {
			// get partner information
			console.log("Get partner information");
			$.getJSON('data/partners.js', function(partners) {
				console.log("Update data structure with partner information");

				for (var c = 0; c < partners.length; c++) {
					var partner = partners[c];
					self.partnersById[partner.id] = partner;
				}
			}).error(function() {
				console.log("Did you make an error in the data/partners.js file?");
			}).success(function() {
				console.log("Retrieved data structure successfully");
			});

			console.log("Add event handler to on-click event for a listed crownstone");
			$('#findCrownstones').on('click', function(event) {
				console.log("User clicks button to start searching for crownstones");

				if (!searching) {
					searching = true;
					searchCrownstones();
				} else {
					searching = false;
					stopSearch();
					console.log("sort");
				}
			});
		});

		searchCrownstones = function() {

			$('#findCrownstones').html("Stop");

			$('#crownStoneTable').hide();
			$('#closestCrownstone').html("Closest Crownstone: ");
			var map = {};

			findCrownstones(function(obj) {

				if (!map.hasOwnProperty(obj.address)) {
					map[obj.address] = {'name': obj.name, 'rssi': obj.rssi};
				} else {
					map[obj.address]['rssi'] = obj.rssi;
				}

				var r = new Array(), j = -1;
				r[++j] = '<col width="20%">';
				r[++j] = '<col width="60%">';
				r[++j] = '<col width="20%">';
				r[++j] = '<tr><th align="left">Nr</th><th align="left">MAC</th><th align="left">RSSI</th></tr>';

				var nr = 0;
				var closest_rssi = -128;
				var closest_name = "";
				for (var el in map) {
					r[++j] ='<tr id="'
						r[++j] = el;
					r[++j] = '"><td>';
					r[++j] = ++nr;
					r[++j] = '</td><td>';
					r[++j] = map[el]['name'] + '<br/>' + el;
					r[++j] = '</td><td>';
					r[++j] = map[el]['rssi'];
					r[++j] = '</td></tr>';

					if (map[el]['rssi'] > closest_rssi) {
						closest_rssi = map[el]['rssi'];
						closest_name = map[el]['name'];
					}
				}
				$('#crownStoneTable').show();
				$('#crownStoneTable').html(r.join(''));

				$('#closestCrownstone').html("Closest Crownstone: <b>" + closest_name + "</b>");

				$(document).on("click", "#crownStoneTable tr", function(e) {
					console.log('Clicked on a crownstone in table, stop searching and connect');
					if (searching) {
						searching = false;
						stopSearch();
					}
					var timeout = 5;
					connect(this.id, timeout, gotoControlPage, connectionFailed);
					$('#crownstone').show();
				})
			});
		}

		gotoControlPage = function() {
			$.mobile.changePage("#controlPage", {transition:'slide', hashChange:true});

		}

		connectionFailed = function() {
			if (!connected) {
				navigator.notification.alert(
						'Could not connect to Crownstone',
						null,
						'BLE error',
						'Sorry!');
			} else {
				navigator.notification.alert(
						'Crownstone disconnected!!',
						function() {
							// go back to selection page
							$('#crownstone').hide();
							history.back();
						},
						'BLE error',
						'Try again!');
			}
		}


		/*******************************************************************************************************
		 * Control page
		 ******************************************************************************************************/


		$('#controlPage').on('pagecreate', function() {
			console.log("Create page to control a crownstone");

			// $('#pwm').on('slidestop focusout', function() {
			//  setPWM($(this).val());
			// });
			$('#setPWM').on('click', function(event) {
				setPWM($('#pwm').val());
			});

			$('#powerON').on('click', function(event) {
				powerON();
				$('#pwm').val(255).slider('refresh');
			});

			$('#powerOFF').on('click', function(event) {
				powerOFF();
				$('#pwm').val(0).slider('refresh');
			});

			$('#repeatPowerOnOff').on('click', function(event) {
				console.log("Stop scan if running");
				if (repeatFunctionHandle) {
					console.log("Clear repeat action");
					clearInterval(repeatFunctionHandle);
					repeatFunctionHandle = null;
					$('#powerState').hide();
					return;
				}
				console.log("Set repeat action");

				ble.togglePower(function() {
					$('#powerState').show();
					repeatFunctionHandle = setInterval(function() { ble.togglePower(); }, 4000);
				});
			});

			$('#getTemperature').on('click', function(event) {
				readTemperature(function(temperature) {
					$('#temperature').html("Temperature: " + temperature + " °C");
					$('#temperature').show();
				});
			});

			$('#scanDevices').on('click', function(event) {
				// $(this).prop("disabled", true);
				startDeviceScan(function() {
					setTimeout(stopDeviceScan, 10000);
					setTimeout(getDeviceList, 11000);
				});
				// $(this).progressbar("option", "value", false);
			});

			$('#setCurrentLimit').on('click', function(event) {
				setCurrentLimit($('#currentLimit').val());
			});

			$('#getCurrentLimit').on('click', function(event) {
				getCurrentLimit(function(currentLimit) {
					$('#currentLimit').val(currentLimit);
				});
			});

			$('#sampleCurrentCurve').on('click', function(event) {
				ble.readCurrentCurve(function(result) {
					var list = [];
					// Number of incremental values:
					var i=0;
					var size=(result[i+1] << 8) + result[i];
					i+=2;
					if (!size) {
						console.log("0 samples!");
						console.log(JSON.stringify(list));
						return;
					}
					if (result.length < 2+2+2+4+4+size-1) {
						console.log("Invalid current curve data (size mismatch)")
							console.log(JSON.stringify(list));
						return;
					}
					var v = (result[i+1] << 8) + result[i];
					i+=2;
					i+=2;
					var t_start = (result[i+3] << 24) + (result[i+2] << 16) + (result[i+1] << 8) + result[i];
					i+=4;
					var t_end =   (result[i+3] << 24) + (result[i+2] << 16) + (result[i+1] << 8) + result[i];
					i+=4;
					// Convert timestamp to seconds, divide by clock rate (32768Hz)
					var t_step = (t_end-t_start) / (size-1) / 32768;
					var t=t_start;
					list.push([(t-t_start)/32768, v]);
					for (var k=1;k<size; ++k, ++i) {
						var dv=result[i];
						if (dv > 127) dv-=256;
						v+=dv;
						var dt=result[i+size-1];
						if (dt > 127) dt-=256;
						t+=dt
							list.push([(t-t_start)/32768, v]);
						//list.push([k*t_step, v]);
					}
					console.log(JSON.stringify(list));
					$('#currentCurve').show();
//                              $.plot("#currentCurve", [list], {xaxis: {show: false}});
					$.plot("#currentCurve", [list]);
				});
			});

			$('#getCurrentConsumption').on('click', function(event) {
				ble.readCurrentConsumption(function(currentConsumption) {
					$('#currentConsumption').html("Current consumption: " + currentConsumption + " [mA]");
					$('#currentConsumption').show();
				});
			});

			var TRACK_DEVICE_LEN = 7;
			$('#getTrackedDevices').on('click', function(event) {
				getTrackedDevices(function(list) {
					var size = Object.size(list);
					var elements = list[0];
					var trackedDevices = $('#trackedDevices');
					if (elements * TRACK_DEVICE_LEN + 1 != size) {
						console.log("size error, arraySize: " + size + "but should be: " + Number(list[0] * TRACK_DEVICE_LEN + 1));
					} else {
						// deviceTable.remove();
						var r = new Array(), j = -1;
						r[++j] = '<col width="20%">';
						r[++j] = '<col width="50%">';
						r[++j] = '<col width="30%">';
						r[++j] = '<tr><th align="left">Nr</th><th align="left">MAC</th><th align="left">RSSI</th></tr>';

						var uint8toString = function(nbr) {
							var str = nbr.toString(16).toUpperCase();
							return str.length < 2 ? '0' + str : str;
						};
						for (var i = 0; i < elements; i++) {
							var idx = 1 + i * TRACK_DEVICE_LEN;
							var mac = "{0}-{1}-{2}-{3}-{4}-{5}".format(uint8toString(list[idx]), uint8toString(list[idx+1]),
									uint8toString(list[idx+2]), uint8toString(list[idx+3]),
									uint8toString(list[idx+4]), uint8toString(list[idx+5]));
							var rssi = list[idx+6];
							if (rssi > 127) {
								rssi -= 256;
							}
							console.log("list item {0}: mac={1}, rssi={2}".format(i+1, mac, rssi));

							r[++j] ='<tr id="';
							r[++j] = mac;
							r[++j] = '"><td>';
							r[++j] = i+1;
							r[++j] = '</td><td>';
							r[++j] = mac;
							r[++j] = '</td><td>';
							r[++j] = rssi;
							r[++j] = '</td></tr>';

						}
						trackedDevices.show();
						trackedDevices.html(r.join(''));

						$(document).on("click", "#trackedDevices tr", function(e) {
							$('#trackAddress').val(this.id);
						})

					}
				});
			});

			$('#addTrackedDevice').on('click', function(event) {
				addTrackedDevice($('#trackAddress').val(), $('#trackRSSI').val());
				//tracking = !tracking;
				//if (tracking) {
					//$(this).html('Stop tracking');
				//} else {
					//$(this).html('Start tracking');
				//}
			});

			$('#disconnect').on('click', function(event) {
				disconnect();
				$('#crownstone').hide();
				history.back();
			})

			$('#settings').on('click', function(event) {
				settingsShown = true;
				$.mobile.changePage("#settingsPage", {transition:'slide', hashChange:true});
			})

		});

		$('#settingsPage').on('pagecreate', function() {

			$('#reloadConfig').on('click', function(event) {
				reloadConfig(false);
			});

			$('#saveConfig').on('click', function(event) {
				saveConfig(false);
			});

			$('#deviceName').change(function() {
				if (configuration.deviceName != this.value) {
					console.log('deviceName has changed, old: ' + configuration.deviceName + ", now: " + this.value);
					$(this).addClass('dirty');
				} else {
					$(this).removeClass('dirty');
				}
			})

			// $('#deviceType').change(function() {
			// 	if (configuration.deviceType != this.value) {
			// 		console.log('deviceType has changed, old: ' + configuration.deviceType + ", now: " + this.value);
			// 		$(this).addClass('dirty');
			// 	} else {
			// 		$(this).removeClass('dirty');
			// 	}
			// })

			// $('#room').change(function() {
			// 	if (configuration.room != this.value) {
			// 		console.log('room has changed, old: ' + configuration.room + ", now: " + this.value);
			// 		$(this).addClass('dirty');
			// 	} else {
			// 		$(this).removeClass('dirty');
			// 	}
			// })

			$('#floor').change(function() {
				if (configuration.floor != this.value) {
					console.log('floor has changed, old: ' + configuration.floor + ", now: " + this.value);
					$(this).addClass('dirty');
				} else {
					$(this).removeClass('dirty');
				}
			})

			$('#txPower').change(function() {
				if (configuration.txPower != this.value) {
					console.log('txPower has changed, old: ' + configuration.txPower + ", now: " + this.value);
					// need to check for dirty, otherwise the change is triggered recursively
					if (!$(this).hasClass('dirty')) {
						// change is neccessary otherwise the dirty will not be visible
						$(this).addClass('dirty').change();
					}
				} else {
					// need to check for dirty, otherwise the change is triggered recursively
					if ($(this).hasClass('dirty')) {
						// change is neccessary otherwise the dirty will not be visible
						$(this).removeClass('dirty').change();
					}
				}
			})

			$('#advertisementInterval').change(function() {
				if (configuration.advertisementInterval != this.value) {
					console.log('advertisementInterval has changed, old: ' + configuration.advertisementInterval + ", now: " + this.value);
					$(this).addClass('dirty');
				} else {
					$(this).removeClass('dirty');
				}
			})

		});

		$('#settingsPage').on('pageshow', function() {
			if (!configurationLoaded) {
				reloadConfig(true);
			}
		});

		// triggering of get characteristics for the initial value
		// needs to be delayed. if all are requested at the same
		// time then some will get lost, so we trigger each get
		// at a different time
		var trigger = 0;
		var triggerDelay = 1000;
		reloadConfig = function(all) {

			navigator.notification.activityStart("Load Configuration", "loading");

			// reset trigger
			trigger = 0;

			if (all || $('#deviceName').hasClass('dirty')) {
				setTimeout(function() {
					getDeviceName(function(deviceName) {
						configuration.deviceName = deviceName;
						$('#deviceName').val(deviceName);
						$('#deviceName').removeClass('dirty');
					});
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				trigger += 1;
			}

			// if (all || $('#deviceType').hasClass('dirty')) {
			// 	setTimeout(function() {
			// 		getDeviceType(function(deviceType) {
			// 			configuration.deviceType = deviceType;
			// 			$('#deviceType').val(deviceType);
			// 			$('#deviceType').removeClass('dirty');
			// 		});
			// 	}, (trigger++) * triggerDelay);

			// 	// need to schedule some more time because it is 2 characteristic
			// 	// calls to get the configuration
			// 	trigger += 1;
			// }

			// if (all || $('#room').hasClass('dirty')) {
			// 	setTimeout(function() {
			// 		getRoom(function(room) {
			// 			configuration.room = room;
			// 			$('#room').val(room);
			// 			$('#room').removeClass('dirty');
			// 		});
			// 	}, (trigger++) * triggerDelay);

			// 	// need to schedule some more time because it is 2 characteristic
			// 	// calls to get the configuration
			// 	trigger += 1;
			// }

			if (all || $('#floor').hasClass('dirty')) {
				setTimeout(function() {
					getFloor(function(floor) {
						configuration.floor = floor;
						$('#floor').val(floor);
						$('#floor').removeClass('dirty');
					});
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				trigger += 1;
			}

			if (all || $('#txPower').hasClass('dirty')) {
				setTimeout(function() {
					getTxPower(function(txPower) {
						configuration.txPower = txPower;
						$('#txPower').val(txPower).change();
						$('#txPower').removeClass('dirty').change();
					});
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				trigger += 1;
			}

			if (all || $('#advertisementInterval').hasClass('dirty')) {
				setTimeout(function() {
					getAdvertisementInterval(function(advertisementInterval) {
						configuration.advertisementInterval = advertisementInterval;
						$('#advertisementInterval').val(advertisementInterval);
						$('#advertisementInterval').removeClass('dirty');
					});
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				trigger += 1;
			}

			setTimeout(function() {
				navigator.notification.activityStop();
				configurationLoaded = true;
			}, trigger * triggerDelay);
		}

		saveConfig = function(all) {

			navigator.notification.activityStart("Save Configuration", "saving");

			// reset trigger
			trigger = 0;

			if (all || $('#deviceName').hasClass('dirty')) {
				setTimeout(function() {
					var deviceName = $('#deviceName').val();
					setDeviceName(deviceName);
					configuration.deviceName = deviceName;
					$('#deviceName').removeClass('dirty');
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				// trigger += 1;
			}

			// if (all || $('#deviceType').hasClass('dirty')) {
			// 	setTimeout(function() {
			// 		var deviceType = $('#deviceType').val();
			// 		setDeviceType(deviceType);
			// 		configuration.deviceType = deviceType;
			// 		$('#deviceType').removeClass('dirty');
			// 	}, (trigger++) * triggerDelay);

			// 	// need to schedule some more time because it is 2 characteristic
			// 	// calls to get the configuration
			// 	// trigger += 1;
			// }

			// if (all || $('#room').hasClass('dirty')) {
			// 	setTimeout(function() {
			// 		var room = $('#room').val();
			// 		setRoom(room);
			// 		configuration.room = room;
			// 		$('#room').removeClass('dirty');
			// 	}, (trigger++) * triggerDelay);

			// 	// need to schedule some more time because it is 2 characteristic
			// 	// calls to get the configuration
			// 	// trigger += 1;
			// }

			if (all || $('#floor').hasClass('dirty')) {
				setTimeout(function() {
					var floor = $('#floor').val();
					setFloor(floor);
					configuration.floor = floor;
					$('#floor').removeClass('dirty');
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				// trigger += 1;
			}

			if (all || $('#txPower').hasClass('dirty')) {
				setTimeout(function() {
					var txPower = $('#txPower').val();
					setTxPower(txPower);
					configuration.txPower = txPower;
					$('#txPower').removeClass('dirty').change();
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				// trigger += 1;
			}

			if (all || $('#advertisementInterval').hasClass('dirty')) {
				setTimeout(function() {
					var advertisementInterval = $('#advertisementInterval').val();
					setAdvertisementInterval(advertisementInterval);
					configuration.advertisementInterval = advertisementInterval;
					$('#advertisementInterval').removeClass('dirty');
				}, (trigger++) * triggerDelay);

				// need to schedule some more time because it is 2 characteristic
				// calls to get the configuration
				// trigger += 1;
			}

			setTimeout(function() {
				navigator.notification.activityStop();
			}, trigger * triggerDelay);

		}

		$('#controlPage').on('pageshow', function(event) {
			if (settingsShown) {
				settingsShown = false;
				return;
			}

			configurationLoaded = false;

			if (!connectedDeviceAddress) {
				console.log("no connected device address assigned");
			}

			if (typeof shake !== 'undefined') {
				shake.startWatch(onShake, 30);
			}

			// clear fields
			$('#deviceName').val('');
			$('#deviceType').val('');
			$('#Room').val('');
			$('#currentLimit').val('');
			$('#trackAddress').val('');
			$('#trackRSSI').val('');

			$('#deviceTable').html('');
			$('#trackedDevices').html('');
			$('#floor').val('');
			$('#txPower').val('');
			$('#advertisementInterval').val('');

			$('#settings').hide();

			// hide all tabs, will be shown only if
			// service / characteristic is available
			$('#scanDevicesTab').hide();
			$('#getTemperatureTab').hide();
			$('#pwmTab').hide();
			$('#currentConsumptionTab').hide();
			$('#currentConsumption').hide();
			$('#currentLimitTab').hide();
			$('#trackedDevicesTab').hide();
			$('#currentCurveTab').hide();
			$('#currentCurve').hide();

			// discover available services
			discoverServices(
					function discoverSuccessful(serviceUuid, characteristicUuid) {
						console.log("updating: " + serviceUuid + ' : ' + characteristicUuid);

						if (serviceUuid == BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID) {
							if (characteristicUuid == BleTypes.CHAR_DEVICE_SCAN_UUID) {
								$('#scanDevicesTab').show();
							}
							if (characteristicUuid == BleTypes.CHAR_ADD_TRACKED_DEVICE_UUID) {
								$('#trackedDevicesTab').show();
							}
						}
						if (serviceUuid == BleTypes.GENERAL_SERVICE_UUID) {
							if (characteristicUuid == BleTypes.CHAR_TEMPERATURE_UUID) {
								$('#getTemperatureTab').show();
							}
							if (characteristicUuid == BleTypes.CHAR_SET_CONFIGURATION_UUID) {
								console.log("set config char found");
								$('#settings').show();
							}
						}
						if (serviceUuid == BleTypes.POWER_SERVICE_UUID) {
							if (characteristicUuid == BleTypes.CHAR_PWM_UUID) {
								$('#pwmTab').show();
							}
							if (characteristicUuid == BleTypes.CHAR_CURRENT_CONSUMPTION_UUID) {
								$('#currentConsumptionTab').show();
							}
							if (characteristicUuid == BleTypes.CHAR_CURRENT_LIMIT_UUID) {
								$('#currentLimitTab').show();
								// request current limit to fill initial value
								setTimeout(function() {
									$('#getCurrentLimit').trigger('click');
								}, (trigger++) * triggerDelay);
							}
							if (characteristicUuid == BleTypes.CHAR_CURRENT_CURVE_UUID) {
								$('#currentCurveTab').show();
							}
						}
					},
					function discoveryFailure(msg) {
						console.log(msg);
						// do we really want to disconnect here?
						disconnect();
					}
			);
		});

		$('#controlPage').on('pagehide', function(event) {
			if (connected && !settingsShown) {
				disconnect();
			}

			if (typeof shake !== 'undefined') {
				shake.stopWatch();
			}
		});

		var lastShake = $.now();
		var SHAKE_TIMEOUT = 1000; // 1 second timeout before handling the next shake event
		onShake = function() {
			if ($.now() - lastShake > SHAKE_TIMEOUT) {
				console.log("on shake, toggle Power!!");
				ble.togglePower();
				lastShake = $.now();
			}
		}

		setPWM = function(pwm, callback) {
			console.log("Set pwm to " + pwm);
			ble.writePWM(pwm, callback);
		}

		getPWM = function(callback) {
			console.log("Reading current PWM value");
			ble.readPWM(callback);
		}

		powerON = function(callback) {
			if (!connectedDeviceAddress) {
				console.log("no connected device address!!");
				return;
			}

			console.log("switch power ON");
			$('#powerState').html("LED: ON");
			powerStateOn = true;
			ble.powerOn(callback);
		}

		powerOFF = function(callback) {
			if (!connectedDeviceAddress) {
				console.log("no connected device address!!");
				return;
			}

			console.log("switch power OFF");
			$('#powerState').html("LED: OFF");
			powerStateOn = false;
			ble.powerOff(callback);
		}

		//togglePower = function(callback, cargs) {
			//if (!connectedDeviceAddress) {
				//console.log("no connected device address!!");
				//return;
			//}

			//console.log('Switch power event');
			//if (powerStateOn) {
				//powerOFF(callback, cargs);
			//} else {
				//powerON(callback, cargs);
			//}
		//}

		startDeviceScan = function(callback) {
			navigator.notification.activityStart("Device Scan", "scanning");
			console.log("Scan for devices");
			ble.writeScanDevices(true, callback);
		}

		stopDeviceScan = function(callback) {
			console.log("Stop Scan");
			ble.writeScanDevices(false, callback);
		}

		getDeviceList = function() {
			navigator.notification.activityStop();
			console.log("Get Device List");
			ble.readScannedDevices(function(list) {
				var size = Object.size(list);
				var elements = list[0];
				var deviceList = $('#deviceList');
				var deviceTable = $('#deviceTable');
				if (elements * 9 + 1 != size) {
					console.log("size error, arraySize: " + size + "but should be: " + list[0] * 9 + 1);
				} else {
					// deviceTable.remove();
					var r = new Array(), j = -1;
					r[++j] = '<col width="20%">';
					r[++j] = '<col width="40%">';
					r[++j] = '<col width="20%">';
					r[++j] = '<col width="20%">';
					r[++j] = '<tr><th align="left">Nr</th><th align="left">MAC</th><th align="left">RSSI</th><th align="left">Occur</th>';
					for (var i = 0; i < elements; i++) {
						var idx = 1 + i * 9;
						var mac = "{0}-{1}-{2}-{3}-{4}-{5}".format(list[idx].toString(16).toUpperCase(), list[idx+1].toString(16).toUpperCase(),
								list[idx+2].toString(16).toUpperCase(), list[idx+3].toString(16).toUpperCase(),
								list[idx+4].toString(16).toUpperCase(), list[idx+5].toString(16).toUpperCase());
						var rssi = list[idx+6];
						if (rssi > 127) {
							rssi -= 256;
						}
						var occurences = list[idx+7] << 8 || list[idx+8];
						console.log("list item {0}: mac={1}, rssi={2}, occ={3}".format(i, mac, rssi, occurences));

						r[++j] ='<tr id="'
							r[++j] = mac;
						r[++j] = '"><td>';
						r[++j] = i;
						r[++j] = '</td><td>';
						r[++j] = mac;
						r[++j] = '</td><td>';
						r[++j] = rssi;
						r[++j] = '</td><td>';
						r[++j] = occurences;
						r[++j] = '</td></tr>';

					}
					deviceTable.show();
					deviceTable.html(r.join(''));

					$(document).on("click", "#deviceTable tr", function(e) {
						cordova.plugins.clipboard.copy(this.id);
					})

					$('#scanDevices').prop("disabled", false);
				}
			});
		}

		readTemperature = function(callback) {
			console.log("Reading temperature");
			ble.readTemperature(callback);
		}

		getCurrentConsumption = function(callback) {
			console.log("Reading consumption");
			ble.readCurrentConsumption(callback);
		}

		getDeviceName = function(callback) {
			console.log("Get device name");
			ble.readDeviceName(callback);
		}

		setDeviceName = function(deviceName, callback) {
			console.log("Set device name to: " + deviceName);
			ble.writeDeviceName(deviceName, callback);
		}

		getDeviceType = function(callback) {
			console.log("Get device type");
			ble.readDeviceType(callback);
		}

		setDeviceType = function(deviceType, callback) {
			console.log("Set device type to: " + deviceType);
			ble.writeDeviceType(deviceType, callback);
		}

		getRoom = function(callback) {
			console.log("Get room");
			ble.readRoom(callback);
		}

		setRoom = function(room, callback) {
			console.log("Set room to: " + room);
			ble.writeRoom(room, callback);
		}

		getCurrentLimit = function(callback) {
			console.log("Get current limit");
			ble.readCurrentLimit(callback);
		}

		setCurrentLimit = function(currentLimit, callback) {
			console.log("Set current limit to: " + currentLimit);
			ble.writeCurrentLimit(currentLimit, callback);
		}

		/** Find crownstones and report the RSSI strength of the advertisements
		 *
		 *
		 */
		findCrownstones = function(callback) {
			console.log("Find crownstones");
			ble.setScanFilter(bluenet.BleFilter.crownstone);
			ble.startScan(callback);
			findTimer = setInterval(
				function() {
					console.log("restart");
					ble.stopScan(function() {
						ble.startScan(callback);
					});
				},
				1000
			);
		}

		stopSearch = function() {
			$('#findCrownstones').html("Find Crownstones");
			console.log("stop search");
			ble.stopScan();
			clearInterval(findTimer);
		}

		connect = function(address, timeout, successCB, errorCB) {
			if (typeof address === 'undefined') {
				console.error("Huh, address is undefined");
				return;
			}
			if (!(connected || connecting)) {
				connecting = true;
				console.log("Connecting to " + address);
				ble.connect(
					address,
					function() {
						connecting = false;
						connected = true;
						connectedDeviceAddress = address;
						if (successCB) successCB();
					},
					function() {
						connecting = false;
						var msg = "Connection failure";
						if (errorCB) errorCB(msg);
					}
				);
			}
		}

		discoverServices = function(callback) {
			console.log("discover services");
			trigger = 0;
			ble.discoverServices(callback);
		}

		disconnect = function() {
			if (connected) {
				connected = false;
				console.log("disconnecting...");
				ble.disconnect();
				connectedDeviceAddress = null;
			}
		}

		getTrackedDevices = function(callback) {
			console.log("Get tracked devices");
			ble.readTrackedDevices(callback);
		}

		addTrackedDevice = function(address, rssi, successCB, errorCB) {
			var bt_address = hexStringToBluetoothAddress(address);
			if (!bt_address.length) {
				console.log("error, malformed bluetooth address");
				if (errorCB) errorCB();
				return;
			}
			console.log("Add tracked device");
			ble.writeTrackedDevice(bt_address, rssi, successCB, errorCB);
		}

		//sampleCurrentConsumption = function(callback) {
			//if (!connectedDeviceAddress) {
				//console.log("no connected device address!!");
				//return;
			//}

			//console.log("Sample current consumption");
			//ble.sampleCurrent(connectedDeviceAddress, 0x01, callback);
		//}

		//sampleCurrentCurve = function(callback) {
			//if (!connectedDeviceAddress) {
				//console.log("no connected device address!!");
				//return;
			//}

			//console.log("Sample current curve");
			//ble.sampleCurrent(connectedDeviceAddress, 0x02, callback);
		//}

		//getCurrentCurve = function(callback) {
			//if (!connectedDeviceAddress) {
				//console.log("no connected device address!!");
				//return;
			//}

			//console.log("Get current curve");
			//ble.getCurrentCurve(connectedDeviceAddress, callback);
		//}

		/* Getting a floor in the configuration characteristic
		 *
		 *  + requires connecting to the device
		 */
		getFloor = function(callback, errorCB) {
			console.log("Get floor level");
			ble.readFloor(callback, errorCB);
		}

		setFloor = function(value, successCB, errorCB) {
			ble.writeFloor(value, successCB, errorCB);
		}

		/* Getting the TX power from the configuration characteristic
		 *
		 *  + requires connecting to the device
		 */
		getTxPower = function(callback, errorCB) {
			console.log("Get tx power");
			ble.readTxPower(callback, errorCB);
		}

		setTxPower = function(value, successCB, errorCB) {
			ble.writeTxPower(value, successCB, errorCB);
		}

		/* Getting the advertisement interval from the configuration characteristic
		 *
		 *  + requires connecting to the device
		 */
		getAdvertisementInterval = function(callback, errorCB) {
			console.log("Get advertisement interval");
			ble.readAdvertisementInterval(callback, errorCB);
		}

		setAdvertisementInterval = function(value, successCB, errorCB) {
			ble.writeAdvertisementInterval(value, successCB, errorCB);
		}

		/*******************************************************************************************************
		 * Create about page
		 ******************************************************************************************************/

		/* About page
		 *
		 * Shows information about company.
		 */
		$('#aboutPage').on("pagecreate", function() {
			var partnerId = "dobots";
			console.log('Show partner ' + partnerId);
			var partner = self.partnersById[partnerId];
			if (partner) {
				if (partner.logo) {
					$('#allPartnerLogo').attr('src', 'img/logos/' + partner.logo);
				}
				if (partner.name) {
					$('#allPartnersDetailsPage .ui-title').text(partner.name);
				}
				if (partner.description) {
					$('#allPartnerDescription').text(partner.description);
				}
				if (partner.address) {
					$('#allPartnerAddress').text(partner.address);
				}
				if (partner.tel) {
					var spaceless_tel = partner.tel.replace(/\s+/g, '');
					var clickable_tel = '<a href="tel:' + spaceless_tel + '">tel: ' +
						partner.tel + '</a>';
					$('#allPartnerTel').html(clickable_tel);
				}
				if (partner.website) {
					$('#allPartnerWebsite').html('<a href="' + partner.website + '">' +
							partner.website + '</a>');
				}
				if (partner.email) {
					$('#allPartnerEmail').html('<a href="mailto:' + partner.email +
							'?Subject=Memo">' +
							partner.email + '</a>');
				}
			} else {
				console.error('Could not select ' + partnerId);
			}
		});

		/*******************************************************************************************************
		 * Create indoor localization page
		 ******************************************************************************************************/

		/* Indoor localization page
		 *
		 * Searches for crownstones in the neighborhood
		 */
		$('#indoorLocalizationPage').on("pagecreate", function() {
			console.log("Create indoor localization page");

			self.building.count = 5;
			self.building.floors = {};
			for (i = -1; i < self.building.count-1; i++) {
				self.building.floors[i] = {};
				self.building.floors[i].level = i;
				self.building.floors[i].devices = [];
			}

			// create table to represent floor of building
			var table = $('<table></table>');
			var floor_cnt = 5;
			var column_cnt = 2;
			var row;
			var field;
			var style;
			style  = $('<col width="20%">');
			table.append(style);
			style = $('<col width="80%">');
			table.append(style);
			// header
			row = $('<tr></tr>');
			// no seperate th fields, first td is automatically header in css
			field = $('<td></td>').text("Floor");
			row.append(field);
			field = $('<td></td>').text("Nodes");
			row.append(field);
			table.append(row);

			// assume floor starts at -1
			for (i = self.building.count-1; i >= -1; i--) {
				row = $('<tr></tr>');
				row.prop('id', 'buildingRow' + i);
				field = $('<td></td>').text(i);
				row.append(field);
				field = $('<td></td>').addClass('buildingField').text('');
				row.append(field);
				field.prop('id', 'buildingField' + i);
				table.append(row);
			}

			$('#building').append(table);

			$('#searchFloorBtn').on('click', function(event) {
				console.log("User clicks button to start/stop search crownstones for localization");

				if (localizing) {
					stopLocalizing();
				}

				if (!floorsearching) {
					startFloorSearching();
				} else {
					stopFloorSearching();
				}
			});

			$('#localizeBtn').on('click', function(event) {
				console.log("User clicks button to start/stop to use found crownstones for localization");
				if (floorsearching) {
					stopFloorSearching();
				}
				if (!localizing) {
					startLocalizing();
				} else {
					stopLocalizing();
				}
			});

			var test_dummy_crownstone = false;
			if (test_dummy_crownstone) {
				var obj = {};
				obj.name = "test";
				obj.rssi = -49;
				var floor = 0;
				self.building.floors[floor].devices.push(obj);
				averageRSSI();
				updateTable(0,obj);
			}
		});

		/** Test function returns the floor with most crownstones
		*/
		mostCrownstones = function() {
			var max_count = -1; var max_level = -1;
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				if (f.count > max_count) {
					max_level = fl;
					max_count = f.count;
				}
			}
			return max_level;
		}

		updateTable = function(floor, device) {
			var jqueryID = '#buildingField' + floor;
			var txt = $(jqueryID).text();
			if (device.name) {
				$(jqueryID).text(device.name + ' ' + txt);
			} else {
				$(jqueryID).text('unknown device ' + txt);
			}
		}

		updateTableActivity = function() {
			//var select_level = mostCrownstones();
			var select_level = closestLevel();
			if (select_level == -255) return;

			console.log("Set closest floor level to " + select_level);
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				var floor = f.level;
				var jQueryID = '#buildingRow' + floor;
				var elem = $(jQueryID);
				elem.removeClass('activeRow');
			}
			var jQueryID = '#buildingRow' + select_level;
			var elem = $(jQueryID);
			elem.addClass('activeRow');
		}

		startLocalizing = function() {
			localizing = true;
			$('#localizeBtn').text('Stop localizing');
			// search for RSSI signals
			findCrownstones(function(obj) {
				if (!existCrownstone(obj)) {
					//console.log("RSSI value from unknown " + obj.name + ": " + obj.rssi);
					//TODO: in hindsight also add crownstones, but only if connection goes okay
					// because we have to know what level they are at
					//   addCrownstone(obj);
				} else {
					console.log("New RSSI value for " + obj.name + ": " + obj.rssi);
					//updateCrownstone(obj);
					updateRSSI(obj);
					updateVisibility();
					averageRSSI();
					updateTableActivity();
				}
			});
		}

		closestLevel = function() {
			var highest_rssi = -1000;
			var level = -255;
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				if (f.avg_rssi) {
					if (f.avg_rssi > highest_rssi) {
						highest_rssi = f.avg_rssi;
						level = fl;
					}
				}
			}
			return level;
		}

		updateRSSI = function(obj) {
			console.log("updateRSSI()");
			var level = getLevel(obj);
			if (!level) {
				console.log("Error: crownstone not found on any floor level");
				return;
			}
			var f = self.building.floors[level];
			for (var i = 0; i < f.devices.length; i++) {
				var device = f.devices[i];
				if (device.address == obj.address) {
					device.rssi = obj.rssi;
					device.rssiHistory.push(obj.rssi);

					// remove oldest element if max history reached
					if (device.rssiHistory.length > MAX_HISTORY) {
						device.rssiHistory.shift();
						console.log("rssiHistory overflow");
					}

					// update weight. for weight use the frequency with which the device is seen.
					// this is caluclated per second
					device.count++;
					if ($.now() - device.lastWeightUpdate > 1000) {
						device.weight = device.count / ($.now() - device.lastWeightUpdate) * 1000;
						device.lastWeightUpdate = $.now();
						device.count = 0;
						console.log("weight update: " + device.name + ": " + device.weight);
					}

					// update last seen and set to visible
					device.lastSeen = $.now();
					device.visible = true;
				}
			}
		}

		/* updated visibility of crownstones. check TTL, if time since
		 * last update is greater than TTL, set visible to false
		 */
		updateVisibility = function() {
			console.log("updateVisibility()");
			for (var idx in self.building.floors) {
				var floor = self.building.floors[idx];
				if (!floor.devices.length) continue;

				for (var i = 0; i < floor.devices.length; ++i) {
					var device = floor.devices[i];
					if ($.now() - device.lastSeen > TTL) {
						console.log("RSSI for " + device.name + " expired!");
						device.visible = false;
						initDevice(device);
					}
				}
			}
		}

		/* Return the average RSSI value of a floor.
		 *
		 */
		averageRSSI = function() {
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				if (!f.devices.length) continue;

				var srssi = 0;
				var count = 0;
				for (var i = 0; i < f.devices.length; i++) {
					var crownstone = f.devices[i];
					if (crownstone.visible) {
						var deviceRssiAvg = 0;
						var deviceCount = 0;
						for (var j = 0; j < crownstone.rssiHistory.length; j++) {
							deviceRssiAvg += crownstone.rssiHistory[j];
							deviceCount++;
						}
						srssi += deviceRssiAvg / deviceCount * crownstone.weight;
						count += crownstone.weight;
						// srssi += crownstone.rssi;
						// count++;
					}
				}
				f.avg_rssi = srssi / count;
				f.weight = count;
			}
			var str = ' ';
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				if (f.avg_rssi) {
					str += f.avg_rssi.toFixed(2) + ' (' + f.weight.toFixed(2) + ') ';
				} else {
					str += '-?? ';
				}
			}
			console.log("Averages floor RSSI [" + str + "]");

		}

		getLevel = function(device) {
			for (var fl in self.building.floors) {
				var f = self.building.floors[fl];
				for (var i = 0; i < f.devices.length; i++) {
					var crownstone = f.devices[i];
					if (crownstone.address == device.address) {
						return fl;
					}
				}
			}
			return null;
		}

		stopLocalizing = function() {
			$('#localizeBtn').text('Start localizing');
			stopSearch();
			localizing = false;
		}

		initDevice = function(obj) {
			obj.rssiHistory = [];
			obj.lastWeightUpdate = $.now()
				obj.weight = 0;
			obj.count = 0;
		}

		startFloorSearching = function() {
			floorsearching = true;
			$('#searchFloorBtn').text('Stop searching');

			// find crownstones by scanning for them
			findCrownstones(function(obj) {

				// update map of crownstones
				if (!hasSeen(obj)) {
					var address = obj.address;
					// TODO: if we can not get this service/characteristic multiple times for a specific device
					// assume it to be not there and don't try to connect to it
					console.log("Connect and get floor");
					connectAndDiscover(
							address,
							BleTypes.GENERAL_SERVICE_UUID,
							BleTypes.CHAR_GET_CONFIGURATION_UUID,
							function() {
								getFloor(function(floor) {
									console.log("Floor found: " + floor);
									initDevice(obj);
									self.building.floors[floor].devices.push(obj);
									updateTable(floor, obj);
									disconnect();
									addCrownstone(obj);
								}, function(msg) {
									generalErrorCB(msg);
									disconnect();
								})
							},
							function(msg) {
								// addToBlacklist(obj);
								if ((self.underQuestion.hasOwnProperty(device.address))) {
									if (++self.underQuestion[device.address].count >= 3) {
										addToBlacklist(obj);
									}
								} else {
									self.underQuestion[device.address] = {'count' : 0};
								}
							}
					);
				} else if (!isInBlacklist(obj)) {
					updateCrownstone(obj, 100);
				}
			});
		}

		/** Connect and discover
		 *
		 * This function does do the boring connection and discovery work before a characteristic can be read
		 * or written. It does not disconnect, that's the responsbility of the callee.
		 */
		connectAndDiscover = function(address, serviceUuid, characteristicUuid, successCB, errorCB) {
			var timeout = 10; // 10 seconds here
			/*
				var connected = ble.isConnected(address);
				if (connected) {
				console.log("Device is already connected");
				} else {
				console.log("Device is not yet connected");
				}*/
			console.log("Connect to service " + serviceUuid + " and characteristic " + characteristicUuid);
			connect(
					address,
					timeout,
					function connectionSuccess() {
						ble.discoverCharacteristic(
								address,
								serviceUuid,
								characteristicUuid,
								successCB,
								function discoveryFailure(msg) {
									console.log(msg);
									disconnect();
									errorCB(msg);
								}
								)
					},
					function connectionFailure(msg) {
						errorCB(msg);
					}
					);
		}

		generalErrorCB = function(msg) {
			console.log(msg);
		}

		stopFloorSearching = function() {
			// stop scanning
			stopSearch();
			floorsearching = false;
			$('#searchFloorBtn').text('Start to search');
		}

		hasSeen = function(device) {
			return existCrownstone(device) || isInBlacklist(device);
		}

		existCrownstone = function(device) {
			return (self.crownstones.hasOwnProperty(device.address));
		}

		addCrownstone = function(device) {
			console.log("Add crownstone: " + device.name);
			// initialize rssi history and average value to current rssi
			device.rssiHistory = [device.rssi];
			device.avgRSSI = device.rssi;
			device.lastSeen = $.now();
			self.crownstones[device.address] = device;
		}

		updateCrownstone = function(device, max_history) {
			// console.log("Update crownstone: " + device.address);
			var crownstone = self.crownstones[device.address];
			crownstone.rssi = device.rssi;
			crownstone.lastSeen = $.now();

			// remove oldest element if max history reached
			crownstone.rssiHistory.push(device.rssi);
			if (crownstone.rssiHistory.length > max_history) {
				crownstone.rssiHistory.shift();
			}

			// calculate average rssi value
			var avgRSSI = 0;
			for (var i = 0; i < crownstone.rssiHistory.length; ++i) {
				avgRSSI += crownstone.rssiHistory[i];
			}
			crownstone.avgRSSI = avgRSSI / crownstone.rssiHistory.length;
		}

		updateClosestCrownstone = function() {
			self.closestCrownstone = {avgRSSI: -255};
			self.wifiCrownstone = {};
			for (var addr in self.crownstones) {
				var device = self.crownstones[addr];
				if (!device.ignore && device.avgRSSI > self.closestCrownstone.avgRSSI) {
					self.closestCrownstone = device;
				}
				if (device.name.indexOf("wifi") > -1) {
                   self.wifiCrownstone = device;
                }
			}
		}

		updateTTL = function() {
			for (var addr in self.crownstones) {
				var device = self.crownstones[addr];
				if ($.now() - device.lastSeen > TTL) {
					delete self.crownstones[addr];
				}
			}
		}

		updateCrownstoneList = function(device, max_history) {
			if (!existCrownstone(device)) {
				addCrownstone(device);
			} else {
				updateCrownstone(device, max_history);
			}

			// updateTTL();
			updateClosestCrownstone();
		}

		resetCrownstoneList = function() {
			self.crownstones = {};
			self.closestCrownstone = {avgRSSI: -255};
			self.wifiCrownstone = {};
		}

		addToBlacklist = function(device) {
			console.log("Crownstone: " + device.name + " does not support indoor localisation. adding to blacklist");
			self.blacklist[device.address] = device;
		}

		isInBlacklist = function(device) {
			return (self.blacklist.hasOwnProperty(device.address));
		}

		// start
		start();
	}
}

