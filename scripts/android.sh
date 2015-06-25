#!/bin/bash

usage_string="Usage: $0 {build|upload|log|release}"
cmd=${1:? "$usage_string"}

path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
working_path=$path/..

name="Crownstone"
name1="CrownStone"
package_prefix="nl.dobots"
tag="CordovaLog"
tag="chromium"

# working path, should be parent directory of script directory
echo "Navigate to working path: $working_path"
cd $working_path

release() {
	if [[ -z $KEYSTORE_DIR ]]; then
		echo "define \$KEYSTORE_DIR as 'path/to/dobots/keystore' in .bashrc"
		exit 1
	fi
	# build release version
	cordova build android --release
	pushd platforms/android/build/outputs/apk/
	# backup old release
	mv Crownstone.apk Crownstone.apk.bak
	# sign apk
	jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -tsa http://timestamp.digicert.com -keystore $KEYSTORE_DIR/dobots.ks Crownstone-release-unsigned.apk crownstone
	# zipalign apk
	zipalign -v 4 android-release-unsigned.apk Crownstone.apk
	nautilus .
	popd
}

build() {
	cordova build android
}

upload() {
	# adb install -r platforms/android/ant-build/$name-debug.apk
	# adb install -r platforms/android/build/outputs/apk/android-debug.apk
	# start
	cordova run android
}

start() {
	adb shell am start -n $package_prefix.$name1/.$name
}

log() {
	adb logcat -s "$tag" -t 0
}

all() {
	build
	sleep 1
	upload
	sleep 1
	log
}

case "$cmd" in
	release)
		release
		;;
	build)
		build
		;;
	upload)
		upload
		;;
	start)
		start
		;;
	log)
		log
		;;
	all)
		all
		;;
	*)
		echo $usage_string
		exit 1
esac
