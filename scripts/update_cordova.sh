#!/bin/bash

cd ..

echo "Add android as platform and update"
cordova platform add android
cordova platform update android

echo "Current plugin versions"
cordova plugin

echo "Remove plugins of previous versions of the crownstone app"
cordova plugin remove org.apache.cordova.device
cordova plugin remove org.apache.cordova.dialogs
cordova plugin remove org.apache.cordova.device-motion
cordova plugin remove uk.co.ilee.shake

echo "Remove plugins currently in use by the crownstone app"
cordova plugin remove com.randdusing.bluetoothle
cordova plugin remove com.verso.cordova.clipboard
cordova plugin remove nl.dobots.bluenet
cordova plugin remove cordova-plugin-device
cordova plugin remove cordova-plugin-dialogs
cordova plugin remove cordova-plugin-device-motion
cordova plugin remove cordova-plugin-shake

echo "Backup remaining plugins, if any"
mkdir -p backup
mv plugins "backup/plugins $(date)"

echo "Install current plugins"
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-dialogs
cordova plugin add cordova-plugin-device-motion
cordova plugin add cordova-plugin-shake
cordova plugin add com.randdusing.bluetoothle
cordova plugin add com.verso.cordova.clipboard

# The following stopped working for Cordova 5.1+
# cordova plugin add https://github.com/dobots/bluenet-lib-js.git
mkdir -p plugins/src
cd plugins/src
git clone https://github.com/dobots/bluenet-lib-js.git
cd ../..
cordova plugin add plugins/src/bluenet-lib-js

# cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device.git

#cordova plugin rm /data/ws_cordova/cordova-plugin-sensors
#cordova plugin add /data/ws_cordova/cordova-plugin-sensors

echo "New plugin versions"
cordova plugin
