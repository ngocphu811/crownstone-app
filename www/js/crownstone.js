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

		$.ajaxSetup({ cache: false });

		start = function() {
			console.log("Go to first page");
			$.mobile.changePage("#controlPage", {transition:'slide', hashChange:true});
		}

		// very important statement to make swiping work: 
		// https://stackoverflow.com/questions/12838443/swipe-with-jquery-mobile-1-2-phonegap-2-1-and-android-4-0-4-not-working-properl
		document.ontouchmove = function(event) {    
		        event.preventDefault();
		};

		var powerStateOn = false;

		$('#controlPage').on('pagecreate', function() {
			console.log("Create first page to control a crownstone");
			
			// set up bluetooth connection
			ble.init();


			// set handler on button click
			$('#switchPower').on('click', function(event) {
				console.log("Stop scan if running");
				ble.stopScan();
				togglePower();
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
				$(this).prop("disabled", true);
				startDeviceScan(function() {
					setTimeout(stopDeviceScan, 10000);
					setTimeout(getDeviceList, 11000);
				});
			});
		});

		togglePower = function(callback, cargs) {
			console.log('Switch power event');
			ble.writePowerLevel();
			powerStateOn = !powerStateOn
			if (powerStateOn) {
				$('#powerState').html("LED: ON");
			} else {
				$('#powerState').html("LED: OFF");
			}
			if (callback) {
				callback(cargs);
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

						// var row = $('<tr/>');
						// var nr_c = $('<td/>').html(i);
						// row.append(nr_c);
						// var mac_c = $('<td/>').html(mac);
						// row.append(mac_c);
						// var rssi_c = $('<td/>').html(rssi);
						// row.append(rssi_c);
						// var occ_c = $('<td/>').html(occurences);
						// row.append(occ_c);

						// deviceTable.append(row);

						// var item = $('<li/>').html("{0}&nbsp;{1}&nbsp;{2}&nbsp;{3}".format(i, mac, rssi, occurences));
						// deviceList.append(item);
					}
					deviceTable.show();
					deviceTable.html(r.join(''));
					$('#scanDevices').prop("disabled", false);
					// deviceTable.show();
					// deviceTable.table('refresh');
					// deviceList.show();
					// deviceList.listview('refresh');
				}
			});
		}

		readTemperature = function(callback) {
			console.log("Reading temperature");
			ble.readTemperature(callback);
		}

		start();	
	}
}

