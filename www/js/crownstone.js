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

		// $('#controlPage').on('pagecreate', function() {
		start = function() {
			console.log("Create first page to control a crownstone");
			
			// set up bluetooth connection
			ble.init();


			// set handler on button click
			// $('#switchPower').on('click', function(event) {
			// 	console.log("Stop scan if running");
			// 	ble.stopScan();
			// 	togglePower();
			// });

			$('#pwm').on('slidestop focusout', function() {
				ble.stopScan();
				setPWM($(this).val());
			});

			$('#powerON').on('click', function(event) {
				ble.stopScan();
				powerON();
			})

			$('#powerOFF').on('click', function(event) {
				ble.stopScan();
				powerOFF();
			})

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
				$(this).prop("disabled", true);
				startDeviceScan(function() {
					setTimeout(stopDeviceScan, 10000);
					setTimeout(getDeviceList, 11000);
				});
			});

			$('#getPowerConsumption').on('click', function(event) {
				ble.stopScan();
				getPowerConsumption(function(powerConsumption) {
					$('#powerConsumption').html("Power consumption: tbd [unit]");
					// $('#powerConsumption').html("Power consumption: " + powerConsumption + " [unit]");
					$('#powerConsumption').show();
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
		};

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

		start();	
	}
}

