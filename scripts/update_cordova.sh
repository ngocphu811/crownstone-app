#!/bin/bash

cordova platform add android
cordova platform update android

echo "Current plugin versions"
# cordova plugin
# cordova plugin remove com.randdusing.bluetoothle
# cordova plugin add com.randdusing.bluetoothle
# cordova plugin remove org.apache.cordova.device
# cordova plugin add org.apache.cordova.device
# cordova plugin rm org.apache.cordova.dialogs
# cordova plugin add org.apache.cordova.dialogs
# cordova plugin rm com.verso.cordova.clipboard
# cordova plugin add com.verso.cordova.clipboard

cordova plugin
cordova plugin remove com.randdusing.bluetoothle
cordova plugin add https://github.com/randdusing/BluetoothLE
cordova plugin remove org.apache.cordova.device
cordova plugin add https://github.com/apache/cordova-plugin-device
cordova plugin rm org.apache.cordova.dialogs
cordova plugin add https://github.com/apache/cordova-plugin-dialogs
cordova plugin rm com.verso.cordova.clipboard
cordova plugin add https://github.com/VersoSolutions/CordovaClipboard

echo "New plugin versions"
cordova plugin
