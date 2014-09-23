function CrownStone() {
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

		$('#controlPage').on('pageshow', function() {
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
					return;
				}
				console.log("Set repeat action");
				togglePower(function() {
					repeatFunctionHandle = setInterval(togglePower, 4000);
				});
			});	
		});

		togglePower = function(callback, cargs) {
			console.log('Switch power event');
			ble.writePowerLevel();
			if (callback) {
				callback(cargs);
			}
		}

		start();	
	}
}

