//////////////////////////////////////////////////////////////////////////////
// Indoor Localisation Service
var indoorLocalisationServiceUuid = '7e170000-429c-41aa-83d7-d91220abeb33';
// Indoor Localisation Service - Characteristics
var rssiUuid = '7e170001-429c-41aa-83d7-d91220abeb33';
var addTrackedDeviceUuid = '7e170002-429c-41aa-83d7-d91220abeb33';
var deviceScanUuid = '7e170003-429c-41aa-83d7-d91220abeb33';
var deviceListUuid = '7e170004-429c-41aa-83d7-d91220abeb33';
var listTrackedDevicesUuid = '7e170005-429c-41aa-83d7-d91220abeb33';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// General Service
var generalServiceUuid = 'f5f90000-59f9-11e4-aa15-123b93f75cba';
// General Service - Characteristics
var temperatureCharacteristicUuid = 'f5f90001-59f9-11e4-aa15-123b93f75cba';
var changeNameCharacteristicUuid = 'f5f90002-59f9-11e4-aa15-123b93f75cba';
var deviceTypeUuid = 'f5f90003-59f9-11e4-aa15-123b93f75cba';
var roomUuid = 'f5f90004-59f9-11e4-aa15-123b93f75cba';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Power Service
var powerServiceUuid = '5b8d0000-6f20-11e4-b116-123b93f75cba';
// Power Service - Characteristics
var pwmUuid = '5b8d0001-6f20-11e4-b116-123b93f75cba';
var sampleCurrentUuid = '5b8d0002-6f20-11e4-b116-123b93f75cba';
var currentCurveUuid = '5b8d0003-6f20-11e4-b116-123b93f75cba';
var currentConsumptionUuid = '5b8d0004-6f20-11e4-b116-123b93f75cba';
var currentLimitUuid = '5b8d0005-6f20-11e4-b116-123b93f75cba';
//////////////////////////////////////////////////////////////////////////////


var BLEHandler = function() {
	var self = this;
	var addressKey = 'address';
	var dobotsCompanyId = 0x1111 // has to be defined, this is only a dummy value

	var scanTimer = null;
	var connectTimer = null;
	var reconnectTimer = null;

	var iOSPlatform = "iOS";
	var androidPlatform = "Android";

	var __callback = null;

	self.init = function(callback) {
		console.log("Initializing connection");
		bluetoothle.initialize(function(obj) {
				console.log('Properly connected to BLE chip');
				console.log("Message " + JSON.stringify(obj));
				if (obj.status == 'enabled') {
					callback(true);
				}
			}, function(obj) {
				console.log('Connection to BLE chip failed');
				console.log('Message', obj.status);
				navigator.notification.alert(
						'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
						null,
						'BLE off?',
						'Sorry!');
				callback(false);
			}, {"request": true});
	}

	self.connectDevice = function(address, callback) {
		_callback = callback;
		console.log("Beginning to connect to " + address + " with 5 second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(self.connectSuccess, self.connectError, paramsObj);
		self.connectTimer = setTimeout(self.connectTimeout, 5000);
	}

	self.connectSuccess = function(obj) {
		if (obj.status == "connected") {
			console.log("Connected to: " + obj.name + " - " + obj.address);

			self.clearConnectTimeout();

			// if (window.device.platform == androidPlatform) {
			// 	console.log("Beginning discovery");
			// 	bluetoothle.discover(self.discoverSuccess, self.discoverError);
			// }

			if (_callback) {
				_callback(true);
				_callback = null;
			}


		//	self.tempDisconnectDevice();
		}
		else if (obj.status == "connecting") {
			console.log("Connecting to: " + obj.name + " - " + obj.address);
		}
		else {
			console.log("Unexpected connect status: " + obj.status);
			self.clearConnectTimeout();
			self.closeDevice();
			if (_callback) {
				_callback(false);
				_callback = null;
			}
		}
	}

	self.connectError = function(obj) {
		console.log("Connect error: " + obj.error + " - " + obj.message);
		self.clearConnectTimeout();
		if (_callback) {
			_callback(false);
			_callback = null;
		}
	}

	self.connectTimeout = function() {
		console.log('Connection timed out, stop connection attempts');
		if (_callback) {
			_callback(false);
			_callback = null;
		}
	}

	self.clearConnectTimeout = function() { 
		console.log("Clearing connect timeout");
		if (self.connectTimer != null) {
			clearTimeout(self.connectTimer);
		}
	}


	self.tempDisconnectDevice = function() {
		console.log("Disconnecting from device to test reconnect");
		bluetoothle.disconnect(self.tempDisconnectSuccess, self.tempDisconnectError);
	}

	self.tempDisconnectSuccess = function(obj) {
		if (obj.status == "disconnected") {
			console.log("Temp disconnect device and reconnecting in 1 second. Instantly reconnecting can cause issues");
			setTimeout(self.reconnect, 1000);
		} else if (obj.status == "disconnecting") {
			console.log("Temp disconnecting device");
		} else {
			console.log("Unexpected temp disconnect status: " + obj.status);
		}
	}

	self.tempDisconnectError = function(obj) {
		console.log("Temp disconnect error: " + obj.error + " - " + obj.message);
	}

	self.reconnect = function() {
		console.log("Reconnecting with 5 second timeout");
		bluetoothle.reconnect(self.reconnectSuccess, self.reconnectError);
		self.reconnectTimer = setTimeout(self.reconnectTimeout, 5000);
	}

	self.reconnectSuccess = function(obj) {
		if (obj.status == "connected") {
			console.log("Reconnected to: " + obj.name + " - " + obj.address);

			self.clearReconnectTimeout();

			if (window.device.platform == iOSPlatform) {
				console.log("Discovering services");
				// var paramsObj = {"serviceUuids": [alertLevelServiceUuid] };
				// bluetoothle.services(self.alertLevelSuccess, self.alertLevelError, paramsObj);
			} else if (window.device.platform == androidPlatform) {
				console.log("Beginning discovery");
				bluetoothle.discover(self.discoverSuccess, self.discoverError);
			}
		} else if (obj.status == "connecting") {
			console.log("Reconnecting to : " + obj.name + " - " + obj.address);
		} else {
			console.log("Unexpected reconnect status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.reconnectError = function(obj) {
		console.log("Reconnect error: " + obj.error + " - " + obj.message);
		disconnectDevice();
	}

	self.reconnectTimeout = function() {
		console.log("Reconnection timed out");
	}

	self.clearReconnectTimeout = function() { 
		console.log("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	}

	self.discoverServices = function(callback) {
		_callback = callback;
		console.log("Beginning discovery");
		bluetoothle.discover(self.discoverSuccess, self.discoverError);
	}

	/**
	 * We now did scan for a device, and found one. Connect to this device. 
	 */
	self.startScanSuccess = function(obj) {
		if (obj.status == 'scanResult') {
			console.log('We got a result! Stop the scan and connect!');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
			window.localStorage.setItem(addressKey, obj.address);
			self.connectDevice(obj.address);
		} else if (obj.status == 'scanStarted') {
			console.log('Scan was started successfully, stopping in 10 seconds');
			self.scanTimer = setTimeout(self.scanTimeout, 10000);
		} else {
			console.log('Unexpected start scan status: ' + obj.status);
			console.log('Stopping scan');
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
			self.clearScanTimeout();
		}
	}
			
	self.stopScan = function() {
		if (bluetoothle.isScanning()) {
			bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
		}
	}

	self.clearScanTimeout = function() { 
		console.log('Clearing scanning timeout');
		if (self.scanTimer != null) 	{
			clearTimeout(self.scanTimer);
		}
	}

	self.scanTimeout = function() {
		console.log('Scanning timed out, stop scanning');
		bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
	}

	self.stopScanSuccess = function(obj) {
		if (obj.status == 'scanStopped') {
			console.log('Scan was stopped successfully');
		} else {
			console.log('Unexpected stop scan status: ' + obj.status);
		}
	}

	self.stopScanError = function(obj) {
		console.log('Stop scan error: ' + obj.error + ' - ' + obj.message);
	}

	self.startScanError = function(obj) {
		console.log('Scan error', obj.status);
		navigator.notification.alert(
				'Could not find a device using Bluetooth scanning.',
				null,
				'Status',
				'Sorry!');
	}

	self.startEndlessScan = function(callback) {
		console.log('start endless scan');
		var paramsObj = {}
		bluetoothle.startScan(function(obj) {
				if (obj.status == 'scanResult') {
					// console.log('name: ' + obj.name + ", addr: " + obj.address + ", rssi: " + obj.rssi);
					var arr = bluetoothle.encodedStringToBytes(obj.advertisement);
					// console.log("adv: " + arr.length + ", " + arr.join(' '));
					// console.log("adv: " + Array.apply([], arr).join(","));
					self.parseAdvertisement(arr, 0xFF, function(data) {
						var value = data[0] << 8 | data[1];
						if (value == dobotsCompanyId) {
							// console.log("found crownstone, company id: 0x" + value.toString(16));
							callback(obj);
						}
					})
				} else if (obj.status == 'scanStarted') {
					console.log('Endless scan was started successfully');
					// self.scanTimer = setTimeout(self.scanTimeout, 10000);
				} else {
					console.log('Unexpected start scan status: ' + obj.status);
					console.log('Stopping scan');
					bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
					// self.clearScanTimeout();
				}
			}, self.startScanError, paramsObj);
	}

	self.stopEndlessScan = function() {
		bluetoothle.stopScan(self.stopScanSuccess, self.stopScanError);
	}
	
	self.parseAdvertisement = function(obj, search, callback) {
		var start = 0;
		var end = obj.length;
		for (var i = 0; i < obj.length; ) {
			var el_len = obj[i];
			var el_type = obj[i+1];
			if (el_type == search) {
				var begin = i+2;
				var end = begin + el_len - 1;
				var el_data = obj.subarray(begin, end);
				callback(el_data);
				return;
			} else if (el_type == 0) {
				// console.log(search.toString(16) + " not found!");
				return;
			} else {
				i += el_len + 1;
			}
		}
	}


	/**
	 * Initalization successful, now start scan if no address yet registered (with which we are already connected).
	 *
	 * We use as a parameter the service uuid of the thing we search for.
	 */
	self.initSuccess = function(obj) {
		console.log('Properly connected to BLE chip');
		console.log("Message " + JSON.stringify(obj));
		if (obj.status == 'enabled') {

			var address = window.localStorage.getItem(self.addressKey);
			if (address == null) {
				console.log('No address known, so start scan');
				var paramsObj = { 'serviceUuids': [generalServiceUuid]};
				// bluetoothle.startScan(self.startScanSuccess, self.startScanError, paramsObj);
			} else {
				console.log('Address already known, so connect directly to ', address);
			}
		}
	}

	self.initError = function(obj) {
		console.log('Connection to BLE chip failed');
		console.log('Message', obj.status);
		navigator.notification.alert(
				'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
				null,
				'BLE off?',
				'Sorry!');
	}

	self.discoverSuccess = function(obj)
	{
		if (obj.status == "discovered")
		{
			console.log("Discovery completed");
			var services = obj.services;
			for (var i = 0; i < services.length; ++i) {
				var serviceUuid = services[i].serviceUuid;
				var characteristics = services[i].characteristics;
				for (var j = 0; j < characteristics.length; ++j) {
					var characteristicUuid = characteristics[j].characteristicUuid;
					console.log("Found service " + serviceUuid + " with characteristic " + characteristicUuid);
					if (_callback) {
						_callback(serviceUuid, characteristicUuid);
					}
				}
			}
			_callback = null;

		}
		else
		{
			console.log("Unexpected discover status: " + obj.status);
			self.disconnectDevice();
		}
	}

	self.discoverError = function(obj)
	{
		console.log("Discover error: " + obj.error + " - " + obj.message);
		self.disconnectDevice();	
		if (_callback) {
			_callback(false);
			_callback = null;
		}
	}

	self.disconnectDevice = function() {
		bluetoothle.disconnect(self.disconnectSuccess, self.disconnectError);
	}

	self.disconnectSuccess = function(obj)
	{
		if (obj.status == "disconnected")
		{
			console.log("Disconnect device");
			self.closeDevice();
		}
		else if (obj.status == "disconnecting")
		{
			console.log("Disconnecting device");
		}
		else
		{
			console.log("Unexpected disconnect status: " + obj.status);
		}
	}

	self.disconnectError = function(obj)
	{
		console.log("Disconnect error: " + obj.error + " - " + obj.message);
	}

	self.closeDevice = function()
	{
		bluetoothle.close(self.closeSuccess, self.closeError);
	}

	self.closeSuccess = function(obj)
	{
		if (obj.status == "closed")
		{
			console.log("Closed device");
		}
		else
		{
			console.log("Unexpected close status: " + obj.status);
		}
	}

	self.closeError = function(obj)
	{
		console.log("Close error: " + obj.error + " - " + obj.message);
	}

	self.readTemperature = function(callback) {
		console.log("Read temperature at service " + generalServiceUuid + ' and characteristic ' + temperatureCharacteristicUuid);
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": temperatureCharacteristicUuid};
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var temperature = bluetoothle.encodedStringToBytes(obj.value);
				console.log("temperature: " + temperature[0]);

				callback(temperature[0]);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading temperature: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.scanDevices = function(scan) {
		var u8 = new Uint8Array(1);
		u8[0] = scan ? 1 : 0;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + indoorLocalisationServiceUuid + ' and characteristic ' + deviceScanUuid );
		var paramsObj = {"serviceUuid": indoorLocalisationServiceUuid, "characteristicUuid": deviceScanUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to device scan characteristic - ' + obj.status);
			} else {
				console.log('Writing to device scan characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing device scan characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.listDevices = function(callback) {
		console.log("Read device list at service " + indoorLocalisationServiceUuid + ' and characteristic ' + deviceListUuid );
		var paramsObj = {"serviceUuid": indoorLocalisationServiceUuid, "characteristicUuid": deviceListUuid };
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var list = bluetoothle.encodedStringToBytes(obj.value);
				console.log("list: " + list[0]);

				callback(list);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading temperature: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.writePWM = function(value) {
		var u8 = new Uint8Array(1);
		u8[0] = value;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + powerServiceUuid + ' and characteristic ' + pwmUuid );
		var paramsObj = {"serviceUuid": powerServiceUuid, "characteristicUuid": pwmUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to pwm characteristic - ' + obj.status);
			} else {
				console.log('Writing to pwm characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing to pwm characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.readPowerConsumption = function(callback) {
		console.log("Read power consumption at service " + powerServiceUuid + ' and characteristic ' + powerConsumptionUuid);
		var paramsObj = {"serviceUuid": powerServiceUuid, "characteristicUuid": powerConsumptionUuid};
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var powerConsumption = bluetoothle.encodedStringToBytes(obj.value);
				console.log("powerConsumption: " + powerConsumption[0]);

				callback(powerConsumption[0]);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading temperature: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.writeDeviceName = function(value) {
		var u8 = bluetoothle.stringToBytes(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid + ' and characteristic ' + changeNameCharacteristicUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": changeNameCharacteristicUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to change name characteristic - ' + obj.status);
			} else {
				console.log('Writing to change name characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing to change name characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.readDeviceName = function(callback) {
		console.log("Read device type at service " + generalServiceUuid + ' and characteristic ' + changeNameCharacteristicUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": changeNameCharacteristicUuid };
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var deviceName = bluetoothle.encodedStringToBytes(obj.value);
				var deviceNameStr = bluetoothle.bytesToString(deviceName);
				console.log("deviceName: " + deviceNameStr);

				callback(deviceNameStr);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading change name characteristic: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.writeDeviceType = function(value) {
		var u8 = bluetoothle.stringToBytes(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid + ' and characteristic ' + deviceTypeUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": deviceTypeUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to device type characteristic - ' + obj.status);
			} else {
				console.log('Writing to device type characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing to device type characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.readDeviceType = function(callback) {
		console.log("Read device type at service " + generalServiceUuid + ' and characteristic ' + deviceTypeUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": deviceTypeUuid };
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var deviceType = bluetoothle.encodedStringToBytes(obj.value);
				var deviceTypeStr = bluetoothle.bytesToString(deviceType);
				console.log("deviceType: " + deviceTypeStr);

				callback(deviceTypeStr);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading device type characteristic: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.writeRoom = function(value) {
		var u8 = bluetoothle.stringToBytes(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid + ' and characteristic ' + roomUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": roomUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to room characteristic - ' + obj.status);
			} else {
				console.log('Writing to room characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing to room characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.readRoom = function(callback) {
		console.log("Read room at service " + generalServiceUuid + ' and characteristic ' + roomUuid );
		var paramsObj = {"serviceUuid": generalServiceUuid, "characteristicUuid": roomUuid };
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var room = bluetoothle.encodedStringToBytes(obj.value);
				var roomStr = bluetoothle.bytesToString(room);
				console.log("room: " + roomStr);

				callback(roomStr);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading room characteristic: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.writeCurrentLimit = function(value) {
		var u8 = new Uint8Array(1);
		u8[0] = value & 0xFF;
		// u8[1] = (value >> 8) & 0xFF;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + powerServiceUuid + ' and characteristic ' + currentLimitUuid );
		var paramsObj = {"serviceUuid": powerServiceUuid, "characteristicUuid": currentLimitUuid , "value" : v};
		bluetoothle.write(function(obj) {
			if (obj.status == 'written') {
				console.log('Successfully written to current limit characteristic - ' + obj.status);
			} else {
				console.log('Writing to current limit characteristic was not successful' + obj);
			}
		},
		function(obj) {
			console.log("Error in writing to current limit characteristic" + obj.error + " - " + obj.message);
		},
		paramsObj);
	}

	self.readCurrentLimit = function(callback) {
		console.log("Read current limit at service " + powerServiceUuid + ' and characteristic ' + currentLimitUuid );
		var paramsObj = {"serviceUuid": powerServiceUuid, "characteristicUuid": currentLimitUuid };
		bluetoothle.read(function(obj) {
			if (obj.status == "read")
			{
				var currentLimit = bluetoothle.encodedStringToBytes(obj.value);
				console.log("current limit: " + currentLimit[0]);

				var value = currentLimit[0];

				callback(value);
			}
			else
			{
				console.log("Unexpected read status: " + obj.status);
				self.disconnectDevice();
			}
		}, 
		function(obj) {
			console.log('Error in reading current limit characteristic: ' + obj.error + " - " + obj.message);
		},
		paramsObj);
	}


	}

		}
	}

}

