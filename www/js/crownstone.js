function CrownStone() {
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
	start:function() {
		var self = this;

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
		// };

		var powerStateOn = false;
		var searching = false;
		var connected = false;
		var tracking = false;

		start = function() {
			console.log("Create first page to find crownstones");
			
			// set up bluetooth connection
			ble.init(function(enabled) {
				$('#findCrownstones').prop("disabled", !enabled);
			});

			$('#findCrownstones').on('click', function(event) {
				ble.stopScan();

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
			});
		}

		$('#controlPage').on('pagecreate', function() {
			console.log("Create page to control a crownstone");

			// $('#pwm').on('slidestop focusout', function() {
			// 	ble.stopScan();
			// 	setPWM($(this).val());
			// });
			$('#setPWM').on('click', function(event) {
				ble.stopScan();
				setPWM($('#pwm').val());
			});

			$('#powerON').on('click', function(event) {
				ble.stopScan();
				powerON();
				$('#pwm').val(255).slider('refresh');
			});

			$('#powerOFF').on('click', function(event) {
				ble.stopScan();
				powerOFF();
				$('#pwm').val(0).slider('refresh');
			});

			$('#repeatPowerOnOff').on('click', function(event) {
				console.log("Stop scan if running");
				ble.stopScan();
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
				ble.stopScan();
				readTemperature(function(temperature) {
					$('#temperature').html("Temperature: " + temperature + " °C");
					$('#temperature').show();
				});
			});

			$('#scanDevices').on('click', function(event) {
				ble.stopScan();
				// $(this).prop("disabled", true);
				startDeviceScan(function() {
					setTimeout(stopDeviceScan, 10000);
					setTimeout(getDeviceList, 11000);
				});
				// $(this).progressbar("option", "value", false);
			});

			$('#getPowerConsumption').on('click', function(event) {
				ble.stopScan();
				getPowerConsumption(function(powerConsumption) {
					$('#powerConsumption').html("Power consumption: tbd [unit]");
					// $('#powerConsumption').html("Power consumption: " + powerConsumption + " [unit]");
					$('#powerConsumption').show();
				});
			});

			$('#setDeviceName').on('click', function(event) {
				ble.stopScan();
				setDeviceName($('#deviceName').val());
			});

			$('#getDeviceName').on('click', function(event) {
				ble.stopScan();
				getDeviceName(function(deviceName) {
					$('#deviceName').val(deviceName);
				});
			});

			$('#setDeviceType').on('click', function(event) {
				ble.stopScan();
				setDeviceType($('#deviceType').val());
			});

			$('#getDeviceType').on('click', function(event) {
				ble.stopScan();
				getDeviceType(function(deviceType) {
					$('#deviceType').val(deviceType);
				});
			});

			$('#setRoom').on('click', function(event) {
				ble.stopScan();
				setRoom($('#room').val());
			});

			$('#getRoom').on('click', function(event) {
				ble.stopScan();
				getRoom(function(room) {
					$('#room').val(room);
				});
			});

			$('#setCurrentLimit').on('click', function(event) {
				ble.stopScan();
				setCurrentLimit($('#currentLimit').val());
			});

			$('#getCurrentLimit').on('click', function(event) {
				ble.stopScan();
				getCurrentLimit(function(currentLimit) {
					$('#currentLimit').val(currentLimit);
				});
			});

			$('#getTrackedDevices').on('click', function(event) {
				ble.stopScan();
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
				ble.stopScan();
				addTrackedDevice($('#trackAddress').val(), $('#trackRSSI').val());
				tracking = !tracking;
				if (tracking) {
					$(this).html('Stop tracking');
				} else {
					$(this).html('Start tracking');
				}
			});

			// $('#findCrownstones').on('click', function(event) {
			// 	ble.stopScan();
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
				ble.stopScan();
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
			$('#powerConsumptionTab').hide();
			$('#currentLimitTab').hide();
			$('#trackedDevicesTab').hide();

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
					if (characteristicUuid == powerConsumptionUuid) {
						$('#powerConsumptionTab').show();
					}
					if (characteristicUuid == currentLimitUuid) {
						$('#currentLimitTab').show();
						// request current limit to fill initial value
						setTimeout(function() {
							$('#getCurrentLimit').trigger('click');
						}, (trigger++) * triggerDelay);
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
			console.log("Set pwm to " + pwm);
			ble.writePWM(pwm);
			if (callback) {
				callback(cargs);
			}
		}

		powerON = function(callback, cargs) {
			console.log("switch power ON");
			$('#powerState').html("LED: ON");
			powerStateOn = true;
			setPWM(255, callback, cargs);
		}

		powerOFF = function(callback, cargs) {
			console.log("switch power OFF");
			$('#powerState').html("LED: OFF");
			powerStateOn = false;
			setPWM(0, callback, cargs);
		}

		togglePower = function(callback, cargs) {
			console.log('Switch power event');
			if (powerStateOn) {
				powerOFF(callback, cargs);
			} else {
				powerON(callback, cargs);
			}
		}

		startDeviceScan = function(callback, cargs) {
			navigator.notification.activityStart("Device Scan", "scanning");
			console.log("Scan for devices");
			ble.scanDevices(true);
			if (callback) {
				callback(cargs);
			}
		}

		stopDeviceScan = function(callback) {
			console.log("Stop Scan");
			ble.scanDevices(false);
		}

		getDeviceList = function() {
			navigator.notification.activityStop();
			console.log("Get Device List");
			ble.listDevices(function(list) {
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
			console.log("Reading temperature");
			ble.readTemperature(callback);
		}

		getPowerConsumption = function(callback) {
			console.log("Reading consumption");
			ble.readPowerConsumption(callback);
		}

		getDeviceName = function(callback) {
			console.log("Get device name");
			ble.readDeviceName(callback);
		}

		setDeviceName = function(deviceName, callback, cargs) {
			console.log("Set device name to: " + deviceName);
			ble.writeDeviceName(deviceName);
			if (callback) {
				callback(cargs);
			}
		}

		getDeviceType = function(callback) {
			console.log("Get device type");
			ble.readDeviceType(callback);
		}

		setDeviceType = function(deviceType, callback, cargs) {
			console.log("Set device type to: " + deviceType);
			ble.writeDeviceType(deviceType);
			if (callback) {
				callback(cargs);
			}
		}

		getRoom = function(callback) {
			console.log("Get room");
			ble.readRoom(callback);
		}

		setRoom = function(room, callback, cargs) {
			console.log("Set room to: " + room);
			ble.writeRoom(room);
			if (callback) {
				callback(cargs);
			}
		}

		getCurrentLimit = function(callback) {
			console.log("Get current limit");
			ble.readCurrentLimit(callback);
		}

		setCurrentLimit = function(currentLimit, callback, cargs) {
			console.log("Set current limit to: " + currentLimit);
			ble.writeCurrentLimit(currentLimit);
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
			console.log("discover services");
			trigger = 0;
			ble.discoverServices(callback);
		}

		disconnect = function() {
			if (connected) {
				connected = false;
				console.log("disconnecting...");
				ble.disconnectDevice();
			}
		}

		getTrackedDevices = function(callback) {
			console.log("Get tracked devices");
			ble.getTrackedDevices(callback);
		}

		addTrackedDevice = function(address, rssi) {
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
			ble.addTrackedDevice(bt_address, rssi);
		}

		start();	
	}
}

