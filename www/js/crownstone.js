function CrownStone() {
	// globally shared object to get logos etc from partners (and ourselves)
	this.partnersById = {};
}

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
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

CrownStone.prototype = {
	/* Start should be called if all plugins are ready and all functionality can be called.
	 */
	start:function() {
		var self = this;

		console.log("---------------------------------------------------------");
		console.log("----- Distributed Organisms B.V. (http://dobots.nl) -----");
		console.log("---------------------------------------------------------");
		console.log("Start CrownStone application");

		var ble = new BLEHandler();

		var repeatFunctionHandle = null;

		// $.ajaxSetup({ cache: false });

		// start = function() {
		// 	console.log("Go to first page");
		// 	$.mobile.changePage("#controlPage", {transition:'slide', hashChange:true});
		// }

		// very important statement to make swiping work: 
		// https://stackoverflow.com/questions/12838443/swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		// document.ontouchmove = function(event) {    
		//         event.preventDefault();
		/// };

		var powerStateOn = false;
		var searching = false;
		var connected = false;
		var tracking = false;

		var connectedDevice = "";

		start = function() {
			console.log("Setup general functionality, enable bluetooth, set event handlers, etc.");
			
			// set up bluetooth connection
			//ble.init(function(enabled) {
			//	$('#findCrownstones').prop("disabled", !enabled);
			//});
		
			// add menu options to side menu 
			$('.sideMenu ul').append('<li><a href="#selectionPage">Overview</a></li>');
			$('.sideMenu ul').append('<li><a href="#localizationPage">Localization</a></li>');
			$('.sideMenu ul').append('<li><a href="#aboutPage">About</a></li>');
			
			// add swipe gesture to all pages with a panel
			console.log("Add swipe gesture to all pages with side panel");
			$(document).delegate('[data-role="page"]', 'pageinit', function () {
				//check for a `data-role="panel"` element to add swiperight action to
				var $panel = $(this).children('[data-role="panel"]');
				if ($panel.length) {
					$(this).on('swiperight', function(event) {
						$panel.panel("open");
					});
				}    
			});

//			$.ajaxSetup({
//				"error": function() {
//					console.log("General error with one of the ajax calls");
//				}
//			});

			console.log("Add event handler to on-click event for a listed crownstone");
			$('#findCrownstones').on('click', function(event) {
				console.log("User clicks button to start searching for crownstones");
				searchCrownstones();
			});
		 	//$.mobile.changePage("#selectionPage", {transition:'slide', hashChange:true});
		}
		
		//$(document).on('pagecreate', '#selectionPage' ,function(){
		$("#selectionPage").on("pagecreate", function(event) {
			// get partner information
			console.log("Get partner information");
			$.getJSON('data/partners.js', function(data) {
				console.log("Update data structure with partner information");
				var partners = data;

				for (var c = 0; c < partners.length; c++) {
					var partner = partners[c];
					self.partnersById[partner.id] = partner;
				}
			}).error(function() {
				console.log("Does the file data/partners.js exist?");
			}).success(function() {
				console.log("Retrieved data structure successfully");
			});
		});

		searchCrownstones = function() {
			if (searching) {
				searching = false;
				stopSearch();
			} else {
				searching = true;

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
						if (searching) {
							searching = false;
							stopSearch();
						}
						connect(this.id);
						$('#crownstone').show();
					})
				});
			}
		}

		$('#controlPage').on('pagecreate', function() {
			console.log("Create page to control a crownstone");

			// $('#pwm').on('slidestop focusout', function() {
			// 	setPWM($(this).val());
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

				togglePower(function() {
					$('#powerState').show();
					repeatFunctionHandle = setInterval(togglePower, 4000);
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

			$('#setDeviceName').on('click', function(event) {
				setDeviceName($('#deviceName').val());
			});

			$('#getDeviceName').on('click', function(event) {
				getDeviceName(function(deviceName) {
					$('#deviceName').val(deviceName);
				});
			});

			$('#setDeviceType').on('click', function(event) {
				setDeviceType($('#deviceType').val());
			});

			$('#getDeviceType').on('click', function(event) {
				getDeviceType(function(deviceType) {
					$('#deviceType').val(deviceType);
				});
			});

			$('#setRoom').on('click', function(event) {
				setRoom($('#room').val());
			});

			$('#getRoom').on('click', function(event) {
				getRoom(function(room) {
					$('#room').val(room);
				});
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
				sampleCurrentCurve(function(success) {
					if (success) {
						setTimeout(function() {
							getCurrentCurve(function(result) {
								var list = [];
								for (var i = 2; i < result.length; ++i) {
									list.push([i-2, result[i]]);
								}
								$('#currentCurve').show();
								$.plot("#currentCurve", [list], {xaxis: {show: false}});
							});
						}, 100);
					} else {

					}
				});
			});

			$('#getCurrentConsumption').on('click', function(event) {
				sampleCurrentConsumption(function(success) {
					if (success) {
						setTimeout(function() {
							getCurrentConsumption(function(currentConsumption) {
								$('#currentConsumption').html("Current consumption: " + currentConsumption + " [mA]");
								$('#currentConsumption').show();
							});
						}, 100);
					} else {

					}
				});
			});

			$('#getTrackedDevices').on('click', function(event) {
				getTrackedDevices(function(list) {
					var size = Object.size(list);
					var elements = list[0];
					var trackedDevices = $('#trackedDevices');
					if (elements * 7 + 1 != size) {
						console.log("size error, arraySize: " + size + "but should be: " + Number(list[0] * 7 + 1));
					} else {
						// deviceTable.remove();
						var r = new Array(), j = -1;
						r[++j] = '<col width="20%">';
						r[++j] = '<col width="50%">';
						r[++j] = '<col width="30%">';
						r[++j] = '<tr><th align="left">Nr</th><th align="left">MAC</th><th align="left">RSSI</th></tr>';
						for (var i = 0; i < elements; i++) {
							var idx = 1 + i * 9;
							var mac = "{0}-{1}-{2}-{3}-{4}-{5}".format(list[idx].toString(16).toUpperCase(), list[idx+1].toString(16).toUpperCase(), 
																	   list[idx+2].toString(16).toUpperCase(), list[idx+3].toString(16).toUpperCase(), 
																	   list[idx+4].toString(16).toUpperCase(), list[idx+5].toString(16).toUpperCase());
							var rssi = list[idx+6];
							if (rssi > 127) {
								rssi -= 256;
							}
							console.log("list item {0}: mac={1}, rssi={2}".format(i+1, mac, rssi));

							r[++j] ='<tr><td>';
							r[++j] = i+1;
							r[++j] = '</td><td>';
							r[++j] = mac;
							r[++j] = '</td><td>';
							r[++j] = rssi;
							r[++j] = '</td></tr>';

						}
						trackedDevices.show();
						trackedDevices.html(r.join(''));
					}
				});
			});

			$('#addTrackedDevice').on('click', function(event) {
				addTrackedDevice($('#trackAddress').val(), $('#trackRSSI').val());
				tracking = !tracking;
				if (tracking) {
					$(this).html('Stop tracking');
				} else {
					$(this).html('Start tracking');
				}
			});

			// $('#findCrownstones').on('click', function(event) {
			// 	$('#crownStoneTable').show();

			// 	var r = new Array(), j = -1;
			// 	r[++j] = '<col width="20%">';
			// 	r[++j] = '<col width="60%">';
			// 	r[++j] = '<col width="20%">';
			// 	r[++j] = '<tr><th align="left">Nr</th><th align="left">MAC</th><th align="left">RSSI</th></tr>';
			// 	$('#crownStoneTable').html(r.join(''));

			// 	var nr = 0;
			// 	var closest_rssi = -128;
			// 	var closest_name = "";
			// 	findCrownstones(function(obj) {
			// 		var existing = $('#crownStoneTable').html();
			// 		var r = new Array(), j = -1;

			// 		r[++j] ='<tr><td>';
			// 		r[++j] = nr++;
			// 		r[++j] = '</td><td>';
			// 		r[++j] = obj.address;
			// 		r[++j] = '</td><td>';
			// 		r[++j] = obj.rssi;
			// 		r[++j] = '</td></tr>';
						
			// 		$('#crownStoneTable').html(existing + r.join(''));

			// 		if (obj.rssi > closest_rssi) {
			// 			closest_rssi = obj.rssi;
			// 			closest_name = obj.name;
			// 		}
			// 	});
			// });

			$('#disconnect').on('click', function(event) {
				disconnect();
				$('#crownstone').hide();
				history.back();
			})

			
		});

		// triggering of get characteristics for the initial value
		// needs to be delayed. if all are requested at the same 
		// time then some will get lost, so we trigger each get 
		// at a different time
		var trigger = 0;
		var triggerDelay = 500;
		$('#controlPage').on('pageshow', function(event) {
			if (!connectedDevice) {
				console.log("no connected device address assigned");
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

			// hide all tabs, will be shown only if
			// service / characteristic is available
			$('#scanDevicesTab').hide();
			$('#getTemperatureTab').hide();
			$('#changeNameTab').hide();
			$('#deviceTypeTab').hide();
			$('#roomTab').hide();
			$('#pwmTab').hide();
			$('#currentConsumptionTab').hide();
			$('#currentLimitTab').hide();
			$('#trackedDevicesTab').hide();
			$('#currentCurveTab').hide();
			$('#currentCurve').hide();

			// discover available services
			discoverServices(function(serviceUuid, characteristicUuid) {
				console.log("updating: " + serviceUuid + ' : ' + characteristicUuid);

				if (serviceUuid == indoorLocalisationServiceUuid) {
					if (characteristicUuid == deviceScanUuid) {
						$('#scanDevicesTab').show();
					} 
					if (characteristicUuid == addTrackedDeviceUuid) {
						$('#trackedDevicesTab').show();
					}
				}
				if (serviceUuid == generalServiceUuid) {
					if (characteristicUuid == temperatureCharacteristicUuid) {
						$('#getTemperatureTab').show();
					}
					if (characteristicUuid == changeNameCharacteristicUuid) {
						$('#changeNameTab').show();
						// request device name to fill initial value
						setTimeout(function() {
							$('#getDeviceName').trigger('click');
						}, (trigger++) * triggerDelay);
					}
					if (characteristicUuid == deviceTypeUuid) {
						$('#deviceTypeTab').show();
						// request device type to fill initial value
						setTimeout(function() {
							$('#getDeviceType').trigger('click');
						}, (trigger++) * triggerDelay);
					}
					if (characteristicUuid == roomUuid) {
						$('#roomTab').show();
						// request room to fill initial value
						setTimeout(function() {
							$('#getRoom').trigger('click');
						}, (trigger++) * triggerDelay);
					}
				}
				if (serviceUuid == powerServiceUuid) {
					if (characteristicUuid == pwmUuid) {
						$('#pwmTab').show();
					}
					if (characteristicUuid == currentConsumptionUuid) {
						$('#currentConsumptionTab').show();
					}
					if (characteristicUuid == currentLimitUuid) {
						$('#currentLimitTab').show();
						// request current limit to fill initial value
						setTimeout(function() {
							$('#getCurrentLimit').trigger('click');
						}, (trigger++) * triggerDelay);
					}
					if (characteristicUuid == currentCurveUuid) {
						$('#currentCurveTab').show();
					}
				}
			});
		});

		$('#controlPage').on('pagehide', function(event) {
			if (connected) {
				disconnect();
			}
		});

		setPWM = function(pwm, callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Set pwm to " + pwm);
			ble.writePWM(connectedDevice, pwm);
			if (callback) {
				callback(cargs);
			}
		}

		powerON = function(callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("switch power ON");
			$('#powerState').html("LED: ON");
			powerStateOn = true;
			setPWM(255, callback, cargs);
		}

		powerOFF = function(callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("switch power OFF");
			$('#powerState').html("LED: OFF");
			powerStateOn = false;
			setPWM(0, callback, cargs);
		}

		togglePower = function(callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log('Switch power event');
			if (powerStateOn) {
				powerOFF(callback, cargs);
			} else {
				powerON(callback, cargs);
			}
		}

		startDeviceScan = function(callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			navigator.notification.activityStart("Device Scan", "scanning");
			console.log("Scan for devices");
			ble.scanDevices(connectedDevice, true);
			if (callback) {
				callback(cargs);
			}
		}

		stopDeviceScan = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Stop Scan");
			ble.scanDevices(connectedDevice, false);
		}

		getDeviceList = function() {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			navigator.notification.activityStop();
			console.log("Get Device List");
			ble.listDevices(connectedDevice, function(list) {
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

						r[++j] ='<tr><td>';
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
					$('#scanDevices').prop("disabled", false);
				}
			});
		}

		readTemperature = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Reading temperature");
			ble.readTemperature(connectedDevice, callback);
		}

		getCurrentConsumption = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Reading consumption");
			ble.readCurrentConsumption(connectedDevice, callback);
		}

		getDeviceName = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get device name");
			ble.readDeviceName(connectedDevice, callback);
		}

		setDeviceName = function(deviceName, callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Set device name to: " + deviceName);
			ble.writeDeviceName(connectedDevice, deviceName);
			if (callback) {
				callback(cargs);
			}
		}

		getDeviceType = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get device type");
			ble.readDeviceType(connectedDevice, callback);
		}

		setDeviceType = function(deviceType, callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Set device type to: " + deviceType);
			ble.writeDeviceType(connectedDevice, deviceType);
			if (callback) {
				callback(cargs);
			}
		}

		getRoom = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get room");
			ble.readRoom(connectedDevice, callback);
		}

		setRoom = function(room, callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Set room to: " + room);
			ble.writeRoom(connectedDevice, room);
			if (callback) {
				callback(cargs);
			}
		}

		getCurrentLimit = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get current limit");
			ble.readCurrentLimit(connectedDevice, callback);
		}

		setCurrentLimit = function(currentLimit, callback, cargs) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Set current limit to: " + currentLimit);
			ble.writeCurrentLimit(connectedDevice, currentLimit);
			if (callback) {
				callback(cargs);
			}
		}

		var findTimer = null;
		findCrownstones = function(callback) {
			console.log("Find crownstones");
			$('#findCrownstones').html("Stop");
			ble.startEndlessScan(callback);
			// [9.12.14] Some devices (such as the Nexus 4) only report
			//   the first advertisement for each device. all
			//   subsequently received advertisements are dropped. In order
			//   to receive rssi updates for such devices too, we now
			//   restart the ble scan every second, thus getting at least
			//	 an rssi update every second
			// if (device.model == "Nexus 4") {
				findTimer = setInterval(function() {
					console.log("restart");
					ble.stopEndlessScan();
					ble.startEndlessScan(callback);
				}, 1000);
			// }
		}

		stopSearch = function() {
			console.log("stop search");
			if (findTimer != null) {
				clearInterval(findTimer);
			}
			ble.stopEndlessScan();
			$('#findCrownstones').html("Find Crownstones");
		}

		connect = function(address) {
			if (!connected) {
				connected = true;
				console.log("connecting to " + address);
				// 
				ble.connectDevice(address, function(connected) {

					if (connected) {
						connectedDevice = address;
						$.mobile.changePage("#controlPage", {transition:'slide', hashChange:true});
					} else {
						navigator.notification.alert(
							'Could not connect to Crownstone',
							null,
							'BLE error',
							'Sorry!');
					}

				});
			}
		}

		discoverServices = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("discover services");
			trigger = 0;
			ble.discoverServices(connectedDevice, callback);
		}

		disconnect = function() {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			if (connected) {
				connected = false;
				console.log("disconnecting...");
				ble.disconnectDevice(connectedDevice);
				connectedDevice = null;
			}
		}

		getTrackedDevices = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get tracked devices");
			ble.getTrackedDevices(connectedDevice, callback);
		}

		addTrackedDevice = function(address, rssi) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			if (address.indexOf(':') > -1) {
				var bt_address = address.split(':');
				if (bt_address.length != 6) {
					console.log("error, malformed bluetooth address");
				}
			} else if (address.indexOf('-') > -1) {
				var bt_address = address.split('-');
				if (bt_address.length != 6) {
					console.log("error, malformed bluetooth address");
				}
			} else  {
				var bt_address = [];
				for (var i = 0; i < 6; i++) {
					bt_address[i] = address.slice(i*2, i*2+2);
				}
			}
			console.log("Add tracked device");
			ble.addTrackedDevice(connectedDevice, bt_address, rssi);
		}

		sampleCurrentConsumption = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Sample current consumption");
			ble.sampleCurrent(connectedDevice, 0x01, callback);
		}

		sampleCurrentCurve = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Sample current curve");
			ble.sampleCurrent(connectedDevice, 0x02, callback);
		}

		getCurrentCurve = function(callback) {
			if (!connectedDevice) {
				console.log("no connected device address!!");
				return;
			}

			console.log("Get current curve");
			ble.getCurrentCurve(connectedDevice, callback);
		}

		/*******************************************************************************************************
		 * Create about page
		 ******************************************************************************************************/

		/* About page
		 *
		 * Shows information about company.
		 */
		$('#aboutPage').on("pagebeforeshow", function() {
			// partner with id == 0, is us, DoBots!
			var partnerId = 0;
			console.log('Show partner ' + partnerId);
			var partner = self.partnersById[partnerId];
			if (partner) {
				if (partner.logo) {
					$('#allPartnerLogo').attr('src', 'img/logos' + partner.logo);
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
		start();	
	}
}

