#!/bin/bash

# This script changes the name "CordovaApp" to "Crownstone"

path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${path}/..

# Just to make sure we have a fresh install of the platform
cordova platform remove android
cordova platform add android

echo "Fix platforms/android/AndroidManifest.xml"
sed -i -re 's/MainActivity/Crownstone/g' platforms/android/AndroidManifest.xml

#echo "Fix platforms/android/build.xml"
#sed -i -re 's/CordovaApp/Crownstone/g' platforms/android/build.xml

#echo "Fix platforms/android/CordovaLib/src/org/apache/cordovaApp.java"
#sed -i -re 's/CordovaApp/Crownstone/g' platforms/android/CordovaLib/src/org/apache/cordovaApp.java

echo "Fix platforms/android/src/nl/dobots/CrownStone/MainActivity.java"
sed -i -re 's/MainActivity/Crownstone/g' platforms/android/src/nl/dobots/CrownStone/MainActivity.java
mv -v platforms/android/src/nl/dobots/CrownStone/MainActivity.java platforms/android/src/nl/dobots/CrownStone/Crownstone.java

echo "Done!"
