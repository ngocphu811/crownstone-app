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

mv plugins "plugins $(date)"

cordova plugin add org.apache.cordova.device-motion
cordova plugin add com.randdusing.bluetoothle
cordova plugin add org.apache.cordova.device
cordova plugin add org.apache.cordova.dialogs
cordova plugin add com.verso.cordova.clipboard
cordova plugin add uk.co.ilee.shake
# cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device.git

echo "New plugin versions"
cordova plugin
