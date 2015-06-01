#!/bin/bash

cd ..

cordova platform add android
cordova platform update android

echo "Current plugin versions"
cordova plugin
cordova plugin remove org.apache.cordova.device
cordova plugin remove org.apache.cordova.dialogs
cordova plugin remove org.apache.cordova.device-motion
cordova plugin remove uk.co.ilee.shake
cordova plugin remove com.randdusing.bluetoothle
cordova plugin remove com.verso.cordova.clipboard

cordova plugin remove cordova-plugin-device
cordova plugin remove cordova-plugin-dialogs
cordova plugin remove cordova-plugin-device-motion
cordova plugin remove cordova-plugin-shake

mv plugins "plugins $(date)"

cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-dialogs
cordova plugin add cordova-plugin-device-motion
cordova plugin add cordova-plugin-shake
cordova plugin add com.randdusing.bluetoothle
cordova plugin add com.verso.cordova.clipboard
# cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device.git

#cordova plugin rm /data/ws_cordova/cordova-plugin-sensors
#cordova plugin add /data/ws_cordova/cordova-plugin-sensors

echo "New plugin versions"
cordova plugin
